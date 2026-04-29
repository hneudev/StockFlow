import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Product from "@/models/Product";
import { CreateProductSchema } from "@/lib/schemas/product.schema";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = req.nextUrl;
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 20)));
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      Product.find().skip(skip).limit(limit).lean(),
      Product.countDocuments(),
    ]);

    return NextResponse.json({ data, total, page, limit });
  } catch {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body: unknown = await req.json();
    const parsed = CreateProductSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(", ") },
        { status: 400 }
      );
    }

    // Verificar SKU duplicado antes de insertar
    const existing = await Product.findOne({ sku: parsed.data.sku }).lean();
    if (existing) {
      return NextResponse.json(
        { error: `Ya existe un producto con el SKU '${parsed.data.sku}'` },
        { status: 409 }
      );
    }

    const product = await Product.create(parsed.data);
    return NextResponse.json(product, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
