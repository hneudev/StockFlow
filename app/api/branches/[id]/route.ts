import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Branch from "@/models/Branch";
import { UpdateBranchSchema } from "@/lib/schemas/branch.schema";

type RouteParams = { params: Promise<{ id: string }> };

function isValidId(id: string): boolean {
  return mongoose.isValidObjectId(id);
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();
    const { id } = await params;

    if (!isValidId(id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const branch = await Branch.findById(id).lean();
    if (!branch) {
      return NextResponse.json({ error: "Sucursal no encontrada" }, { status: 404 });
    }

    return NextResponse.json(branch);
  } catch {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();
    const { id } = await params;

    if (!isValidId(id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const body: unknown = await req.json();
    const parsed = UpdateBranchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(", ") },
        { status: 400 }
      );
    }

    const branch = await Branch.findByIdAndUpdate(id, parsed.data, { new: true }).lean();
    if (!branch) {
      return NextResponse.json({ error: "Sucursal no encontrada" }, { status: 404 });
    }

    return NextResponse.json(branch);
  } catch {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();
    const { id } = await params;

    if (!isValidId(id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const branch = await Branch.findByIdAndDelete(id).lean();
    if (!branch) {
      return NextResponse.json({ error: "Sucursal no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ message: "Sucursal eliminada" });
  } catch {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
