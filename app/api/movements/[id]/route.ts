import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Movement from "@/models/Movement";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const movement = await Movement.findById(id)
      .populate("productId", "name sku")
      .populate("fromBranchId", "name")
      .populate("toBranchId", "name")
      .lean();

    if (!movement) {
      return NextResponse.json({ error: "Movimiento no encontrado" }, { status: 404 });
    }

    return NextResponse.json(movement);
  } catch {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
