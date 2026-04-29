import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Movement from "@/models/Movement";

// ─── Tipos de respuesta ───────────────────────────────────────────────────────

type ByTypeRow    = { type: string; count: number; totalQty: number };
type ByBranchRow  = { branchId: string; branchName: string; entries: number; exits: number; totalQty: number };

type ReportsResponse = {
  byType:    ByTypeRow[];
  byBranch:  ByBranchRow[];
  total:     number;
  dateRange: { from: string; to: string };
};

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = req.nextUrl;

    // Fechas — por defecto últimos 30 días
    const now  = new Date();
    const ago30 = new Date(now);
    ago30.setDate(ago30.getDate() - 30);

    const fromParam = searchParams.get("from");
    const toParam   = searchParams.get("to");
    const branchId  = searchParams.get("branchId") ?? undefined;

    const from = fromParam ? new Date(fromParam) : ago30;
    const to   = toParam   ? new Date(toParam)   : now;

    // Validación básica de fechas
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return NextResponse.json({ error: "Fechas inválidas" }, { status: 400 });
    }

    // Filtro base: rango de fechas + solo movimientos procesados
    const baseMatch: Record<string, unknown> = {
      status:    "processed",
      createdAt: { $gte: from, $lte: to },
    };
    if (branchId) {
      baseMatch.$or = [{ fromBranchId: branchId }, { toBranchId: branchId }];
    }

    // Conteo total
    const total = await Movement.countDocuments(baseMatch);

    // Agrupación por tipo
    const byTypeRaw = await Movement.aggregate<{ _id: string; count: number; totalQty: number }>([
      { $match: baseMatch },
      {
        $group: {
          _id:      "$type",
          count:    { $sum: 1 },
          totalQty: { $sum: "$quantity" },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const byType: ByTypeRow[] = byTypeRaw.map((r) => ({
      type:     r._id,
      count:    r.count,
      totalQty: r.totalQty,
    }));

    // Agrupación por sucursal (fromBranchId como salida, toBranchId como entrada)
    const byBranchRaw = await Movement.aggregate<{
      _id:        string;
      branchName: string;
      entries:    number;
      exits:      number;
      totalQty:   number;
    }>([
      { $match: baseMatch },
      {
        $facet: {
          // Movimientos donde la sucursal es origen (exit o transfer)
          asSource: [
            { $match: { fromBranchId: { $exists: true, $ne: null } } },
            {
              $group: {
                _id:        "$fromBranchId",
                exits:      { $sum: 1 },
                exitQty:    { $sum: "$quantity" },
              },
            },
            {
              $lookup: {
                from:         "branches",
                localField:   "_id",
                foreignField: "_id",
                as:           "branch",
              },
            },
            { $unwind: "$branch" },
            { $project: { _id: 1, branchName: "$branch.name", exits: 1, exitQty: 1 } },
          ],
          // Movimientos donde la sucursal es destino (entry o transfer)
          asDest: [
            { $match: { toBranchId: { $exists: true, $ne: null } } },
            {
              $group: {
                _id:       "$toBranchId",
                entries:   { $sum: 1 },
                entryQty:  { $sum: "$quantity" },
              },
            },
            {
              $lookup: {
                from:         "branches",
                localField:   "_id",
                foreignField: "_id",
                as:           "branch",
              },
            },
            { $unwind: "$branch" },
            { $project: { _id: 1, branchName: "$branch.name", entries: 1, entryQty: 1 } },
          ],
        },
      },
      // Combinar los dos arrays en un mapa por sucursal
      {
        $project: {
          merged: { $concatArrays: ["$asSource", "$asDest"] },
        },
      },
      { $unwind: "$merged" },
      { $replaceRoot: { newRoot: "$merged" } },
      {
        $group: {
          _id:        "$_id",
          branchName: { $first: "$branchName" },
          entries:    { $sum: { $ifNull: ["$entries",  0] } },
          exits:      { $sum: { $ifNull: ["$exits",    0] } },
          totalQty:   { $sum: { $add: [{ $ifNull: ["$entryQty", 0] }, { $ifNull: ["$exitQty", 0] }] } },
        },
      },
      { $sort: { totalQty: -1 } },
    ]);

    const byBranch: ByBranchRow[] = byBranchRaw.map((r) => ({
      branchId:   String(r._id),
      branchName: r.branchName,
      entries:    r.entries,
      exits:      r.exits,
      totalQty:   r.totalQty,
    }));

    const response: ReportsResponse = {
      byType,
      byBranch,
      total,
      dateRange: { from: from.toISOString(), to: to.toISOString() },
    };

    return NextResponse.json(response);
  } catch {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
