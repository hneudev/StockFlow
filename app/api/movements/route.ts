import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Movement from "@/models/Movement";
import { CreateMovementSchema, QueryMovementSchema } from "@/lib/schemas/movement.schema";
import { env } from "@/lib/env";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = req.nextUrl;
    const parsed = QueryMovementSchema.safeParse({
      status: searchParams.get("status") ?? undefined,
      branchId: searchParams.get("branchId") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(", ") },
        { status: 400 }
      );
    }

    const { status, branchId, page, limit } = parsed.data;
    const skip = (page - 1) * limit;

    // Construir filtro dinámico
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (branchId) filter.$or = [{ fromBranchId: branchId }, { toBranchId: branchId }];

    const [data, total] = await Promise.all([
      Movement.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("productId", "name sku")
        .populate("fromBranchId", "name")
        .populate("toBranchId", "name")
        .lean(),
      Movement.countDocuments(filter),
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
    const parsed = CreateMovementSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(", ") },
        { status: 400 }
      );
    }

    // El worker es quien valida stock — aquí solo persistimos
    const movement = await Movement.create({
      ...parsed.data,
      status: "pending",
      attempts: 0,
    });

    // Disparar el worker en background — sin await para no bloquear la respuesta
    void fetch(`${env.NEXT_PUBLIC_APP_URL}/api/worker/trigger`, {
      method: "POST",
    }).catch(() => {
      // Silenciar errores — el cron es el fallback si el trigger falla
    });

    return NextResponse.json(
      { _id: movement._id, status: movement.status, createdAt: movement.createdAt },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
