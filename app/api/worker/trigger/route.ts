import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export async function POST() {
  // Disparar el worker en background — responder 200 inmediatamente sin esperar
  void fetch(`${env.NEXT_PUBLIC_APP_URL}/api/worker/process`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.WORKER_SECRET}` },
  }).catch(() => {
    // Silenciar errores — el cron es el fallback si la llamada al worker falla
  });

  return NextResponse.json({ triggered: true });
}
