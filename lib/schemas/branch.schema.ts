import { z } from "zod";

export const CreateBranchSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  location: z.string().min(1, "La ubicación es requerida"),
});

export const UpdateBranchSchema = CreateBranchSchema.partial();

export type CreateBranchInput = z.infer<typeof CreateBranchSchema>;
export type UpdateBranchInput = z.infer<typeof UpdateBranchSchema>;
