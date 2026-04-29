import { z } from "zod";

export const QueryStockSchema = z.object({
  branchId: z.string().optional(),
  productId: z.string().optional(),
});

export type QueryStockInput = z.infer<typeof QueryStockSchema>;
