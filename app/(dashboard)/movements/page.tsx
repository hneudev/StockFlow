"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  quantity:    number;
  status:      MovementStatus;
  attempts:    number;
  failReason:  string | null;
  processedAt: string | null;
  createdAt:   string;
  updatedAt:   string;
};

// ─── Helpers visuales ─────────────────────────────────────────────────────────

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

const PAGE_SIZE = 20;

// ─── Dialog de detalle ────────────────────────────────────────────────────────

function MovementDetailDialog({
  movement,
  onClose,
}: {
  movement: Movement | null;
  onClose: () => void;
}) {
  if (!movement) return null;

  return (
    <Dialog open={!!movement} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Detalle del movimiento</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <Row label="ID"        value={movement._id} mono />
          <Row label="Tipo"      value={TYPE_LABEL[movement.type]} />
          <Row
            label="Estado"
            value={
              <Badge
                variant="outline"
                className={cn(
                  STATUS_CLASS[movement.status],
                  (movement.status === "pending" || movement.status === "processing") &&
                    "animate-pulse"
                )}
              >
                {STATUS_LABEL[movement.status]}
              </Badge>
            }
          />
          <Row
            label="Producto"
            value={
              movement.productId
                ? `${movement.productId.sku} — ${movement.productId.name}`
                : "—"
            }
          />
          <Row label="Cantidad"  value={String(movement.quantity)} />
          <Row label="Origen"    value={movement.fromBranchId?.name ?? "—"} />
          <Row label="Destino"   value={movement.toBranchId?.name   ?? "—"} />
          <Row label="Intentos"  value={String(movement.attempts)} />

          {movement.failReason && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3">
              <p className="text-xs font-medium text-red-700 mb-1">Motivo del fallo</p>
              <p className="text-xs text-red-600 font-mono break-all">
                {movement.failReason}
              </p>
            </div>
          )}

          <Row label="Creado"    value={new Date(movement.createdAt).toLocaleString("es")} />
          <Row label="Actualizado" value={new Date(movement.updatedAt).toLocaleString("es")} />
          {movement.processedAt && (
            <Row label="Procesado" value={new Date(movement.processedAt).toLocaleString("es")} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="w-28 shrink-0 text-muted-foreground">{label}</span>
      <span className={cn("flex-1 break-all", mono && "font-mono text-xs")}>{value}</span>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function MovementsPage() {
  const [movements,    setMovements]    = useState<Movement[]>([]);
  const [total,        setTotal]        = useState(0);
  const [page,         setPage]         = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [branches,     setBranches]     = useState<Branch[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [selected,     setSelected]     = useState<Movement | null>(null);

  // Cargar sucursales para el filtro (una sola vez)
  useEffect(() => {
    fetch("/api/branches?limit=100")
      .then((r) => r.json())
      .then((d) => setBranches(d.data ?? []));
  }, []);

  const fetchMovements = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit:  String(PAGE_SIZE),
        offset: String((page - 1) * PAGE_SIZE),
      });
      if (statusFilter !== "all") params.set("status",   statusFilter);
      if (branchFilter !== "all") params.set("branchId", branchFilter);

      const res  = await fetch(`/api/movements?${params}`);
      const data = await res.json();
      setMovements(data.data  ?? []);
      setTotal(data.total ?? 0);
    } catch {
      // silencioso — el loading spinner ya indica el estado
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, branchFilter]);

  useEffect(() => { fetchMovements(); }, [fetchMovements]);

  // Resetear a página 1 al cambiar filtros
  const handleStatusChange = (v: string) => { setStatusFilter(v); setPage(1); };
  const handleBranchChange = (v: string) => { setBranchFilter(v); setPage(1); };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold">Movimientos</h2>
          <p className="text-sm text-muted-foreground">{total} en total</p>
        </div>
        <MovementForm onSuccess={fetchMovements} />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={statusFilter} onValueChange={handleStatusChange}>
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

        <Select value={branchFilter} onValueChange={handleBranchChange}>
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
      </div>

      {/* Tabla */}
      <div className="border rounded-md overflow-x-auto flex-1">
        <Table className="min-w-[600px]">
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
            {loading ? (
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
                <TableRow
                  key={m._id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelected(m)}
                >
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

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {/* Dialog de detalle */}
      <MovementDetailDialog
        movement={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
