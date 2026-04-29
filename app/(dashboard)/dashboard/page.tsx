"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import MovementForm from "@/components/movements/MovementForm";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type MovementStatus = "pending" | "processing" | "processed" | "failed";
type MovementType   = "entry" | "exit" | "transfer";

type Branch = { _id: string; name: string; location: string };

type Movement = {
  _id: string;
  type: MovementType;
  productId:    { _id: string; name: string; sku: string } | null;
  fromBranchId: { _id: string; name: string } | null;
  toBranchId:   { _id: string; name: string } | null;
  quantity: number;
  status: MovementStatus;
  createdAt: string;
};

type StockItem = {
  _id: string;
  productId: { _id: string; name: string; sku: string };
  branchId:  { _id: string; name: string };
  quantity: number;
};

// ─── Helpers visuales ────────────────────────────────────────────────────────

const STATUS_CLASS: Record<MovementStatus, string> = {
  pending:    "bg-yellow-100 text-yellow-800 border-yellow-300",
  processing: "bg-blue-100   text-blue-800   border-blue-300",
  processed:  "bg-green-100  text-green-800  border-green-300",
  failed:     "bg-red-100    text-red-800    border-red-300",
};

const STATUS_LABEL: Record<MovementStatus, string> = {
  pending:    "Pendiente",
  processing: "Procesando",
  processed:  "Procesado",
  failed:     "Fallido",
};

const TYPE_LABEL: Record<MovementType, string> = {
  entry:    "Entrada",
  exit:     "Salida",
  transfer: "Transferencia",
};

// ─── Componente ───────────────────────────────────────────────────────────────

export default function DashboardPage() {
  // Estado de movimientos
  const [movements,       setMovements]       = useState<Movement[]>([]);
  const [movTotal,        setMovTotal]        = useState(0);
  const [statusFilter,    setStatusFilter]    = useState("all");
  const [branchFilter,    setBranchFilter]    = useState("all");
  const [branches,        setBranches]        = useState<Branch[]>([]);
  const [loadingMov,      setLoadingMov]      = useState(true);
  const [secondsSince,    setSecondsSince]    = useState(0);

  // Estado de stock
  const [stockItems,   setStockItems]   = useState<StockItem[]>([]);
  const [loadingStock, setLoadingStock] = useState(true);

  // Cargar sucursales para el filtro (una sola vez)
  useEffect(() => {
    fetch("/api/branches?limit=100")
      .then((r) => r.json())
      .then((d) => setBranches(d.data ?? []));
  }, []);

  // Polling de movimientos cada 5s — se reinicia al cambiar filtros
  useEffect(() => {
    let cancelled = false;

    const doFetch = async () => {
      const params = new URLSearchParams({ limit: "20" });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (branchFilter !== "all") params.set("branchId", branchFilter);

      try {
        const res  = await fetch(`/api/movements?${params}`);
        const data = await res.json();
        if (!cancelled) {
          setMovements(data.data ?? []);
          setMovTotal(data.total ?? 0);
          setSecondsSince(0);
          setLoadingMov(false);
        }
      } catch {
        if (!cancelled) setLoadingMov(false);
      }
    };

    doFetch();
    const interval = setInterval(doFetch, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [statusFilter, branchFilter]);

  // Contador "hace X segundos" — se incrementa cada segundo
  useEffect(() => {
    const interval = setInterval(() => setSecondsSince((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Polling de stock cada 30s
  const fetchStock = useCallback(async () => {
    try {
      const res  = await fetch("/api/stock");
      const data = await res.json();
      setStockItems(data.data ?? []);
      setLoadingStock(false);
    } catch {
      setLoadingStock(false);
    }
  }, []);

  useEffect(() => {
    fetchStock();
    const interval = setInterval(fetchStock, 30000);
    return () => clearInterval(interval);
  }, [fetchStock]);

  // Agrupar stock por sucursal
  const stockByBranch = stockItems.reduce<
    Record<string, { branchName: string; items: StockItem[] }>
  >((acc, item) => {
    const id = item.branchId._id;
    if (!acc[id]) acc[id] = { branchName: item.branchId.name, items: [] };
    acc[id].items.push(item);
    return acc;
  }, {});

  return (
    <div className="flex gap-6 h-full min-h-0">

      {/* ── Panel izquierdo: movimientos (60%) ────────────────────────── */}
      <section className="flex-[3] flex flex-col gap-4 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold">Movimientos recientes</h2>
            <p className="text-sm text-muted-foreground">{movTotal} total</p>
          </div>
          <MovementForm onSuccess={() => setSecondsSince(0)} />
        </div>

        {/* Filtros + timestamp */}
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={statusFilter}
            onValueChange={(v) => { setStatusFilter(v); setSecondsSince(0); }}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendiente</SelectItem>
              <SelectItem value="processing">Procesando</SelectItem>
              <SelectItem value="processed">Procesado</SelectItem>
              <SelectItem value="failed">Fallido</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={branchFilter}
            onValueChange={(v) => { setBranchFilter(v); setSecondsSince(0); }}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Sucursal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las sucursales</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b._id} value={b._id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="text-xs text-muted-foreground ml-auto">
            Actualizado hace {secondsSince}s
          </span>
        </div>

        {/* Tabla */}
        <div className="border rounded-md overflow-auto flex-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Origen → Destino</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingMov ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : movements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                    Sin movimientos
                  </TableCell>
                </TableRow>
              ) : (
                movements.map((m) => (
                  <TableRow key={m._id}>
                    <TableCell className="font-medium text-sm">
                      {m.productId
                        ? `${m.productId.sku} — ${m.productId.name}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm">{TYPE_LABEL[m.type]}</TableCell>
                    <TableCell className="text-sm">{m.quantity}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {m.fromBranchId?.name ?? "—"} → {m.toBranchId?.name ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          STATUS_CLASS[m.status],
                          (m.status === "pending" || m.status === "processing") &&
                            "animate-pulse"
                        )}
                      >
                        {STATUS_LABEL[m.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(m.createdAt).toLocaleString("es")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* ── Panel derecho: stock (40%) ─────────────────────────────────── */}
      <section className="flex-[2] flex flex-col gap-4 min-w-0">
        <h2 className="text-xl font-semibold">Stock actual</h2>

        {loadingStock ? (
          <p className="text-muted-foreground">Cargando...</p>
        ) : Object.keys(stockByBranch).length === 0 ? (
          <p className="text-muted-foreground">Sin stock registrado</p>
        ) : (
          <div className="space-y-4 overflow-auto flex-1">
            {Object.entries(stockByBranch).map(([id, { branchName, items }]) => (
              <div key={id} className="border rounded-md overflow-hidden">
                <div className="px-4 py-2 bg-muted font-medium text-sm border-b">
                  {branchName}
                </div>
                {items.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-muted-foreground">
                    Sin stock registrado
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Producto</TableHead>
                        <TableHead className="text-xs text-right">Cant.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item._id}>
                          <TableCell className="text-sm">
                            {item.productId.sku} — {item.productId.name}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "text-sm text-right font-medium",
                              item.quantity <= 10 && "text-red-600"
                            )}
                          >
                            {item.quantity}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
