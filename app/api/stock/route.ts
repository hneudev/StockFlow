import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Stock from "@/models/Stock";
// Side-effect imports — registran los schemas en Mongoose para que .populate() funcione
import "@/models/Product";
import "@/models/Branch";
import { QueryStockSchema } from "@/lib/schemas/stock.schema";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = req.nextUrl;
    const parsed = QueryStockSchema.safeParse({
      branchId: searchParams.get("branchId") ?? undefined,
      productId: searchParams.get("productId") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(", ") },
        { status: 400 }
      );
    }

    const filter: Record<string, string> = {};
    if (parsed.data.branchId) filter.branchId = parsed.data.branchId;
    if (parsed.data.productId) filter.productId = parsed.data.productId;

    const data = await Stock.find(filter)
      .populate("productId", "name sku")
      .populate("branchId", "name")
      .lean();

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
