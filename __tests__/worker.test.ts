import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  processNextMovement,
  classifyError,
  InsufficientStockError,
  CompensationError,
  MAX_ATTEMPTS,
} from "@/lib/worker";
import Movement from "@/models/Movement";
import Stock from "@/models/Stock";

// ─── Mocks de módulos ─────────────────────────────────────────────────────────

// connectDB no debe conectar a MongoDB real en los tests
vi.mock("@/lib/db", () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
}));

// Mock del modelo Movement — solo los métodos que usa el worker
vi.mock("@/models/Movement", () => ({
  default: {
    updateMany:        vi.fn(),
    findOneAndUpdate:  vi.fn(),
  },
}));

// Mock del modelo Stock — solo findOneAndUpdate
vi.mock("@/models/Stock", () => ({
  default: {
    findOneAndUpdate: vi.fn(),
  },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Crea un objeto que simula el documento Mongoose devuelto por findOneAndUpdate.
// El worker muta sus propiedades (status, processedAt, failReason) y llama save().
function makeMovement(overrides: Record<string, unknown> = {}) {
  return {
    _id:          "mov-abc123",
    type:         "exit",
    quantity:     10,
    productId:    "prod-001",
    fromBranchId: "branch-norte",
    toBranchId:   null,
    status:       "processing", // el claim lo pasa a 'processing' antes de devolverlo
    attempts:     1,            // post-incremento del claim atómico
    processedAt:  null,
    failReason:   null,
    save:         vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// ─── Tests de processNextMovement ────────────────────────────────────────────

describe("processNextMovement", () => {
  beforeEach(() => {
    // Limpiar historial de llamadas sin borrar implementaciones del vi.mock() factory
    vi.clearAllMocks();

    // Stale recovery sin movimientos atascados — comportamiento por defecto
    vi.mocked(Movement.updateMany).mockResolvedValue({ modifiedCount: 0 } as any);
  });

  it("happy path — exit exitoso: reclama, actualiza stock y marca processed", async () => {
    const movement = makeMovement();

    vi.mocked(Movement.findOneAndUpdate).mockResolvedValue(movement as any);
    // Stock suficiente — el filtro { quantity: { $gte: 10 } } se cumple, devuelve el doc actualizado
    vi.mocked(Stock.findOneAndUpdate).mockResolvedValue({ quantity: 90 } as any);

    const result = await processNextMovement();

    // Claim atómico con el filtro exacto del worker
    expect(Movement.findOneAndUpdate).toHaveBeenCalledWith(
      { status: "pending", attempts: { $lt: MAX_ATTEMPTS } },
      expect.anything(),
      expect.anything()
    );

    // Stock actualizado con la precondición de cantidad suficiente
    expect(Stock.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ quantity: { $gte: 10 } }),
      expect.anything(),
      expect.anything()
    );

    expect(movement.status).toBe("processed");
    expect(movement.processedAt).toBeDefined();
    expect(result).toEqual({ processed: true, movementId: "mov-abc123" });
  });

  it("stock insuficiente — non-retryable: falla en el primer intento sin reintentar", async () => {
    const movement = makeMovement({ quantity: 9999 });

    vi.mocked(Movement.findOneAndUpdate).mockResolvedValue(movement as any);
    // null → la precondición { quantity: { $gte: 9999 } } no se cumple → InsufficientStockError
    vi.mocked(Stock.findOneAndUpdate).mockResolvedValue(null);

    const result = await processNextMovement();

    expect(movement.status).toBe("failed");
    expect(movement.failReason).toBe("Stock insuficiente para completar el movimiento");
    // attempts sigue en 1: InsufficientStockError es non-retryable, no consumió el segundo intento
    expect(movement.attempts).toBe(1);
    expect(result).toEqual({ processed: false, movementId: "mov-abc123" });
  });

  it("idempotencia — no modifica stock si processedAt ya existe", async () => {
    // Simula crash entre el stock update y movement.save() en un ciclo anterior:
    // el movimiento fue reclamado y el stock actualizado, pero el save() falló.
    // En el siguiente ciclo el worker lo reclama de nuevo con processedAt ya definido.
    const movement = makeMovement({ processedAt: new Date("2025-01-01T00:00:00Z") });

    vi.mocked(Movement.findOneAndUpdate).mockResolvedValue(movement as any);

    const result = await processNextMovement();

    // El guard de idempotencia debe salir antes de llegar a processExit
    expect(Stock.findOneAndUpdate).not.toHaveBeenCalled();
    expect(movement.status).toBe("processed");
    expect(result).toEqual({ processed: true, movementId: "mov-abc123" });
  });
});

// ─── Tests de classifyError ───────────────────────────────────────────────────

describe("classifyError", () => {
  it("InsufficientStockError → non-retryable", () => {
    expect(classifyError(new InsufficientStockError())).toBe("non-retryable");
  });

  it("CompensationError → non-retryable", () => {
    expect(classifyError(new CompensationError("mov-001"))).toBe("non-retryable");
  });

  it("Error genérico → retryable", () => {
    expect(classifyError(new Error("algo salió mal"))).toBe("retryable");
  });

  it("MongoNetworkError → retryable", () => {
    const err = Object.assign(new Error("connection timed out"), {
      name: "MongoNetworkError",
    });
    expect(classifyError(err)).toBe("retryable");
  });
});
