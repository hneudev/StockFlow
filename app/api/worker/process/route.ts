import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { processNextMovement } from "@/lib/worker";
// Side-effect imports — registran los schemas en Mongoose para que .populate() funcione
import "@/models/Product";
import "@/models/Branch";

export async function POST(req: NextRequest) {
  // Verificar el secret antes de ejecutar el worker
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${env.WORKER_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const result = await processNextMovement();
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
