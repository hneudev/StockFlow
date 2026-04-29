import { connectDB } from "@/lib/db";
import Movement from "@/models/Movement";
import Stock from "@/models/Stock";
import Branch from "@/models/Branch";
import {
  serializeMovement,
  serializeStock,
  serializeBranch,
  type SerializedMovement,
  type SerializedStock,
  type SerializedBranch,
} from "@/lib/serializers";
import DashboardClient from "@/components/dashboard/DashboardClient";

export default async function DashboardPage() {
  let movements: SerializedMovement[] = [];
  let stock:     SerializedStock[]    = [];
  let branches:  SerializedBranch[]   = [];

  try {
    await connectDB();

    const [movementDocs, stockDocs, branchDocs] = await Promise.all([
      Movement.find({})
        .sort({ createdAt: -1 })
        .limit(20)
        .populate("productId",    "name sku")
        .populate("fromBranchId", "name")
        .populate("toBranchId",   "name")
        .lean(),
      Stock.find({})
        .populate("productId", "name sku")
        .populate("branchId",  "name")
        .lean(),
      Branch.find({}).lean(),
    ]);

    movements = movementDocs.map(serializeMovement);
    stock     = stockDocs.map(serializeStock);
    branches  = branchDocs.map(serializeBranch);
  } catch (error) {
    console.error("Error cargando datos iniciales:", error);
    // pasar arrays vacíos — el polling del cliente tomará el control
  }

  return (
    <DashboardClient
      initialMovements={movements}
      initialStock={stock}
      initialBranches={branches}
    />
  );
}
