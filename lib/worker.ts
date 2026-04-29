import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Movement, { IMovement } from "@/models/Movement";
import Stock from "@/models/Stock";

// ─── Constantes ──────────────────────────────────────────────────────────────

export const MAX_ATTEMPTS = 2;

// TEST MANUAL — exit con stock insuficiente (Commit 3)
// Request: POST /api/movements
//   { type: "exit", productId: "69f1f72d6f5f96e05606ca32",
//     fromBranchId: "69f1f7056f5f96e05606ca30", quantity: 150 }
// Stock disponible en Norte: 100 — 150 > 100, InsufficientStockError
//
// Resultado observado:
//   attempts: 1, status: "failed"
//   failReason: "Stock insuficiente para completar el movimiento"
//   Nota: InsufficientStockError es non-retryable → falla en el primer intento sin reintentos,
//   aunque MAX_ATTEMPTS = 2. El mecanismo de retry solo aplica a errores retryable.

// TEST MANUAL — transfer Norte → Sur (Commit 4)
// Request: POST /api/movements
//   { type: "transfer", productId: "69f1f72d6f5f96e05606ca32",
//     fromBranchId: "69f1f7056f5f96e05606ca30",
//     toBranchId:   "69f1f70f6f5f96e05606ca31",
//     quantity: 20 }
//
// Resultado observado:
//   Norte: 100 → 80   (fase 1 — $inc: -20)
//   Sur:    50 → 70   (fase 2 — $inc: +20, upsert)
//   status: "processed", attempts: 1
//   event: "worker.job.done", durationMs: ~35ms
//   Compensación no activada — ambas fases completadas satisfactoriamente.

// ─── Errores personalizados ───────────────────────────────────────────────────

export class InsufficientStockError extends Error {
  constructor() {
    super("Stock insuficiente para completar el movimiento");
    this.name = "InsufficientStockError";
  }
}

export class CompensationError extends Error {
  constructor(movementId: string) {
    super(`Compensación fallida — stock del origen puede estar inconsistente (movementId: ${movementId})`);
    this.name = "CompensationError";
  }
}

// ─── Clasificación de errores ─────────────────────────────────────────────────

export function classifyError(err: unknown): "retryable" | "non-retryable" {
  if (err instanceof InsufficientStockError) return "non-retryable";
  if (err instanceof CompensationError) return "non-retryable";
  if (err instanceof mongoose.Error.ValidationError) return "non-retryable";
  // MongoNetworkError vive en el driver nativo dentro de mongoose.mongo
  if (
    err instanceof Error &&
    (err.name === "MongoNetworkError" || err.name === "MongoServerSelectionError")
  ) {
    return "retryable";
  }
  // Conservador: reintentar ante cualquier error desconocido
  return "retryable";
}

// ─── Procesadores por tipo de movimiento ─────────────────────────────────────

async function processEntry(movement: IMovement): Promise<void> {
  if (!movement.toBranchId) throw new Error("entry requiere toBranchId");

  await Stock.findOneAndUpdate(
    { productId: movement.productId, branchId: movement.toBranchId },
    { $inc: { quantity: movement.quantity } },
    { upsert: true, new: true }
  );
}

async function processExit(movement: IMovement): Promise<void> {
  if (!movement.fromBranchId) throw new Error("exit requiere fromBranchId");

  // La precondición quantity >= requested en el filtro garantiza atomicidad sin race conditions
  const result = await Stock.findOneAndUpdate(
    {
      productId: movement.productId,
      branchId: movement.fromBranchId,
      quantity: { $gte: movement.quantity },
    },
    { $inc: { quantity: -movement.quantity } },
    { new: true }
  );

  if (!result) throw new InsufficientStockError();
}

async function processTransfer(movement: IMovement): Promise<void> {
  if (!movement.fromBranchId || !movement.toBranchId) {
    throw new Error("transfer requiere fromBranchId y toBranchId");
  }

  const movementId = String(movement._id);

  // Fase 1: deducir del origen (misma lógica que processExit)
  const sourceResult = await Stock.findOneAndUpdate(
    {
      productId: movement.productId,
      branchId: movement.fromBranchId,
      quantity: { $gte: movement.quantity },
    },
    { $inc: { quantity: -movement.quantity } },
    { new: true }
  );

  if (!sourceResult) throw new InsufficientStockError();

  // Fase 2: agregar al destino (misma lógica que processEntry)
  try {
    await Stock.findOneAndUpdate(
      { productId: movement.productId, branchId: movement.toBranchId },
      { $inc: { quantity: movement.quantity } },
      { upsert: true, new: true }
    );
  } catch (destErr) {
    // Compensación: revertir el decremento del origen para mantener consistencia
    try {
      await Stock.findOneAndUpdate(
        { productId: movement.productId, branchId: movement.fromBranchId },
        { $inc: { quantity: movement.quantity } }
      );
    } catch {
      // La compensación falló — el stock del origen quedó inconsistente
      console.log(
        JSON.stringify({ event: "worker.transfer.compensation_failed", movementId })
      );
      throw new CompensationError(movementId);
    }
    throw destErr;
  }
}

// ─── Función principal ────────────────────────────────────────────────────────

export async function processNextMovement(): Promise<{
  processed: boolean;
  movementId?: string;
}> {
  await connectDB();

  // 1. Stale recovery — resetear movimientos atascados en 'processing' por más de 5 minutos
  const staleResult = await Movement.updateMany(
    {
      status: "processing",
      updatedAt: { $lt: new Date(Date.now() - 5 * 60 * 1000) },
    },
    { $set: { status: "pending" } }
  );

  if (staleResult.modifiedCount > 0) {
    console.log(
      JSON.stringify({ event: "worker.stale.recovered", count: staleResult.modifiedCount })
    );
  }

  // 2. Claim atómico — single-consumer guarantee
  const movement = await Movement.findOneAndUpdate(
    { status: "pending", attempts: { $lt: MAX_ATTEMPTS } },
    { $set: { status: "processing" }, $inc: { attempts: 1 } },
    { new: true, sort: { createdAt: 1 } }
  );

  if (!movement) return { processed: false };

  const movementId = String(movement._id);

  console.log(
    JSON.stringify({
      event: "worker.job.claimed",
      movementId,
      type: movement.type,
      attempts: movement.attempts,
    })
  );

  // 3. Guard de idempotencia — si ya fue procesado, normalizar estado y salir
  if (movement.processedAt) {
    movement.status = "processed";
    await movement.save();
    return { processed: true, movementId };
  }

  const startTime = Date.now();

  try {
    // 4. Procesamiento según type
    if (movement.type === "entry") await processEntry(movement);
    else if (movement.type === "exit") await processExit(movement);
    else await processTransfer(movement);

    // 5a. Éxito
    movement.status = "processed";
    movement.processedAt = new Date();
    await movement.save();

    console.log(
      JSON.stringify({
        event: "worker.job.done",
        movementId,
        status: "processed",
        durationMs: Date.now() - startTime,
      })
    );

    return { processed: true, movementId };
  } catch (err) {
    const classification = classifyError(err);
    const failReason = err instanceof Error ? err.message : "Error desconocido";

    if (classification === "non-retryable" || movement.attempts >= MAX_ATTEMPTS) {
      // Sin reintentos restantes o error no recuperable — marcar como fallido
      movement.status = "failed";
      movement.failReason = failReason;
    } else {
      // Error recuperable con intentos restantes — volver a pending para el siguiente ciclo
      movement.status = "pending";
    }

    await movement.save();

    console.log(
      JSON.stringify({
        event: "worker.job.failed",
        movementId,
        errorClass: err instanceof Error ? err.constructor.name : "UnknownError",
        attempts: movement.attempts,
        failReason,
      })
    );

    return { processed: false, movementId };
  }
}
