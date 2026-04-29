import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";

export async function GET() {
  try {
    await connectDB();

    return NextResponse.json({
      status: "ok",
      db: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ status: "error", message }, { status: 500 });
  }
}
