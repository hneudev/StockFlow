import { config } from "dotenv";
config({ path: ".env.local" });

import mongoose from "mongoose";
import Product from "@/models/Product";
import Branch from "@/models/Branch";
import Stock from "@/models/Stock";
import Movement from "@/models/Movement";

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error("❌  MONGODB_URI no está definida en .env.local");
  process.exit(1);
}

async function seed() {
  await mongoose.connect(uri!, { bufferCommands: false });
  console.log("🔌  Conectado a MongoDB");

  // Limpiar colecciones (idempotente)
  await Promise.all([
    Product.deleteMany({}),
    Branch.deleteMany({}),
    Stock.deleteMany({}),
    Movement.deleteMany({}),
  ]);
  console.log("🗑️   Colecciones limpiadas");

  // ── Sucursales ──────────────────────────────────────────────────────────────
  const branches = await Branch.insertMany([
    { name: "Norte",  location: "Monterrey" },
    { name: "Sur",    location: "Guadalajara" },
    { name: "Centro", location: "CDMX" },
  ]);
  const [norte, sur, centro] = branches;
  console.log(`🏪  Sucursales creadas: ${branches.length}`);

  // ── Productos ───────────────────────────────────────────────────────────────
  const products = await Product.insertMany([
    { sku: "LAPTOP-001",  name: "Laptop Pro 15",     price: 1299.99, category: "Electrónicos" },
    { sku: "MOUSE-002",   name: "Mouse Inalámbrico",  price: 49.99,   category: "Accesorios" },
    { sku: "TECLADO-003", name: "Teclado Mecánico",   price: 89.99,   category: "Accesorios" },
  ]);
  const [laptop, mouse, teclado] = products;
  console.log(`📦  Productos creados: ${products.length}`);

  // ── Stock ───────────────────────────────────────────────────────────────────
  await Stock.insertMany([
    { productId: laptop._id,  branchId: norte._id,  quantity: 50  },
    { productId: mouse._id,   branchId: norte._id,  quantity: 200 },
    { productId: teclado._id, branchId: norte._id,  quantity: 150 },
    { productId: laptop._id,  branchId: sur._id,    quantity: 30  },
    { productId: mouse._id,   branchId: sur._id,    quantity: 180 },
    { productId: teclado._id, branchId: sur._id,    quantity: 120 },
    { productId: laptop._id,  branchId: centro._id, quantity: 20  },
    { productId: mouse._id,   branchId: centro._id, quantity: 150 },
    { productId: teclado._id, branchId: centro._id, quantity: 100 },
  ]);
  console.log("📊  Stock creado: 9 entradas");

  // ── Movimientos ─────────────────────────────────────────────────────────────
  // collection.insertMany bypasses Mongoose timestamp injection para respetar
  // los createdAt escalonados del seed sin que sean sobreescritos por Date.now()
  const now = Date.now();
  const mins = (n: number) => new Date(now - n * 60 * 1000);

  await Movement.collection.insertMany([
    // Entradas procesadas
    {
      type: "entry", productId: laptop._id, fromBranchId: null, toBranchId: norte._id,
      quantity: 20, status: "processed", attempts: 1, failReason: null,
      processedAt: mins(55), createdAt: mins(60), updatedAt: mins(55),
    },
    {
      type: "entry", productId: mouse._id, fromBranchId: null, toBranchId: sur._id,
      quantity: 50, status: "processed", attempts: 1, failReason: null,
      processedAt: mins(45), createdAt: mins(50), updatedAt: mins(45),
    },
    {
      type: "entry", productId: teclado._id, fromBranchId: null, toBranchId: centro._id,
      quantity: 30, status: "processed", attempts: 1, failReason: null,
      processedAt: mins(35), createdAt: mins(40), updatedAt: mins(35),
    },
    // Salidas procesadas
    {
      type: "exit", productId: mouse._id, fromBranchId: norte._id, toBranchId: null,
      quantity: 10, status: "processed", attempts: 1, failReason: null,
      processedAt: mins(28), createdAt: mins(30), updatedAt: mins(28),
    },
    {
      type: "exit", productId: laptop._id, fromBranchId: sur._id, toBranchId: null,
      quantity: 5, status: "processed", attempts: 1, failReason: null,
      processedAt: mins(18), createdAt: mins(20), updatedAt: mins(18),
    },
    {
      type: "exit", productId: teclado._id, fromBranchId: centro._id, toBranchId: null,
      quantity: 15, status: "processed", attempts: 1, failReason: null,
      processedAt: mins(13), createdAt: mins(15), updatedAt: mins(13),
    },
    // Transferencias procesadas
    {
      type: "transfer", productId: laptop._id,
      fromBranchId: norte._id, toBranchId: sur._id,
      quantity: 8, status: "processed", attempts: 1, failReason: null,
      processedAt: mins(8), createdAt: mins(10), updatedAt: mins(8),
    },
    {
      type: "transfer", productId: mouse._id,
      fromBranchId: sur._id, toBranchId: centro._id,
      quantity: 25, status: "processed", attempts: 1, failReason: null,
      processedAt: mins(3), createdAt: mins(5), updatedAt: mins(3),
    },
    // Salida fallida — stock insuficiente
    {
      type: "exit", productId: laptop._id, fromBranchId: centro._id, toBranchId: null,
      quantity: 999, status: "failed", attempts: 1,
      failReason: "Stock insuficiente para completar el movimiento",
      processedAt: null, createdAt: mins(2), updatedAt: mins(2),
    },
    // Salida pendiente — aún en cola
    {
      type: "exit", productId: teclado._id, fromBranchId: norte._id, toBranchId: null,
      quantity: 5, status: "pending", attempts: 0, failReason: null,
      processedAt: null, createdAt: mins(1), updatedAt: mins(1),
    },
  ]);
  console.log("🔄  Movimientos creados: 10");

  console.log("\n✅  Seed completado — DB lista para demo");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("❌  Error en seed:", err);
  process.exit(1);
});
