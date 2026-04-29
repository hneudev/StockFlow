import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Product from "@/models/Product";
import { UpdateProductSchema } from "@/lib/schemas/product.schema";

type RouteParams = { params: Promise<{ id: string }> };

// Valida que el id sea un ObjectId de Mongoose antes de consultar
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

    const product = await Product.findById(id).lean();
    if (!product) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    return NextResponse.json(product);
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
    const parsed = UpdateProductSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(", ") },
        { status: 400 }
      );
    }

    const product = await Product.findByIdAndUpdate(id, parsed.data, { new: true }).lean();
    if (!product) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    return NextResponse.json(product);
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

    const product = await Product.findByIdAndDelete(id).lean();
    if (!product) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ message: "Producto eliminado" });
  } catch {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
