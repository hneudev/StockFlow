import { z } from "zod";

const objectIdString = z.string().min(1, "ID requerido");

// Validación condicional según type — cada rama del discriminatedUnion tiene sus propias reglas
export const CreateMovementSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("entry"),
    productId: objectIdString,
    // entry: solo tiene destino, no tiene origen
    toBranchId: objectIdString,
    fromBranchId: z.null().optional(),
    quantity: z.number().int().min(1, "La cantidad debe ser al menos 1"),
  }),
  z.object({
    type: z.literal("exit"),
    productId: objectIdString,
    // exit: solo tiene origen, no tiene destino
    fromBranchId: objectIdString,
    toBranchId: z.null().optional(),
    quantity: z.number().int().min(1, "La cantidad debe ser al menos 1"),
  }),
  z.object({
    type: z.literal("transfer"),
    productId: objectIdString,
    // transfer: ambos requeridos y deben ser distintos
    fromBranchId: objectIdString,
    toBranchId: objectIdString,
    quantity: z.number().int().min(1, "La cantidad debe ser al menos 1"),
  }).refine(
    (data) => data.fromBranchId !== data.toBranchId,
    { message: "fromBranchId y toBranchId deben ser distintos en un transfer" }
  ),
]);

export const QueryMovementSchema = z.object({
  status: z.enum(["pending", "processing", "processed", "failed"]).optional(),
  branchId: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type CreateMovementInput = z.infer<typeof CreateMovementSchema>;
export type QueryMovementInput = z.infer<typeof QueryMovementSchema>;
