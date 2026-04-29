import { z } from "zod";

// Esquema de validación — falla en arranque si falta alguna variable crítica
const envSchema = z.object({
  MONGODB_URI: z.string().min(1, "MONGODB_URI es requerida"),
  WORKER_SECRET: z.string().min(1, "WORKER_SECRET es requerida"),
  NEXT_PUBLIC_APP_URL: z.string().url("NEXT_PUBLIC_APP_URL debe ser una URL válida"),
});

const parsed = envSchema.safeParse({
  MONGODB_URI: process.env.MONGODB_URI,
  WORKER_SECRET: process.env.WORKER_SECRET,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
});

if (!parsed.success) {
  const missing = parsed.error.issues.map((e) => `  - ${String(e.path[0])}: ${e.message}`).join("\n");
  throw new Error(`Variables de entorno inválidas o ausentes:\n${missing}`);
}

export const env = parsed.data;
