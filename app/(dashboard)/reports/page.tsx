"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Branch = { _id: string; name: string };

type ByTypeRow = {
  type:     string;
  count:    number;
  totalQty: number;
};

type ByBranchRow = {
  branchId:   string;
  branchName: string;
  entries:    number;
  exits:      number;
  totalQty:   number;
};

type ReportsData = {
  byType:    ByTypeRow[];
  byBranch:  ByBranchRow[];
  total:     number;
  dateRange: { from: string; to: string };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<string, string> = {
  entry:    "Entrada",
  exit:     "Salida",
  transfer: "Transferencia",
};

function toInputDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function today(): string {
  return toInputDate(new Date());
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toInputDate(d);
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ReportsPage() {
  const [branches,     setBranches]     = useState<Branch[]>([]);
  const [branchFilter, setBranchFilter] = useState("all");
  const [from,         setFrom]         = useState(daysAgo(30));
  const [to,           setTo]           = useState(() => new Date().toISOString().split("T")[0]);
  const [data,         setData]         = useState<ReportsData | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  // Cargar sucursales para el filtro
  useEffect(() => {
    fetch("/api/branches?limit=100")
      .then((r) => r.json())
      .then((d) => setBranches(d.data ?? []));
  }, []);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ from, to });
      if (branchFilter !== "all") params.set("branchId", branchFilter);

      const res  = await fetch(`/api/reports?${params}`);
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Error al generar el reporte");
        return;
      }

      setData(json as ReportsData);
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold">Reportes</h2>
        <p className="text-sm text-muted-foreground">
          Movimientos procesados en el rango seleccionado
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-4 border rounded-md p-4 bg-muted/30">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="from">Desde</Label>
          <Input
            id="from"
            type="date"
            className="w-40"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="to">Hasta</Label>
          <Input
            id="to"
            type="date"
            className="w-40"
            value={to}
            min={from}
            max={today()}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Sucursal</Label>
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las sucursales</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b._id} value={b._id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={fetchReport} disabled={loading}>
          {loading ? "Generando..." : "Generar reporte"}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-destructive border border-destructive/30 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      {/* Resultados */}
      {data && (
        <div className="flex flex-col gap-6">
          {/* Tarjetas resumen */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <SummaryCard
              label="Total procesados"
              value={data.total}
            />
            {data.byType.map((r) => (
              <SummaryCard
                key={r.type}
                label={TYPE_LABEL[r.type] ?? r.type}
                value={r.count}
                sub={`${r.totalQty} unidades`}
              />
            ))}
          </div>

          {/* Tabla por tipo */}
          <div className="flex flex-col gap-2">
            <h3 className="font-medium text-sm">Por tipo de movimiento</h3>
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Movimientos</TableHead>
                    <TableHead className="text-right">Unidades totales</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.byType.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                        Sin datos
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.byType.map((r) => (
                      <TableRow key={r.type}>
                        <TableCell className="text-sm">
                          {TYPE_LABEL[r.type] ?? r.type}
                        </TableCell>
                        <TableCell className="text-sm text-right">{r.count}</TableCell>
                        <TableCell className="text-sm text-right">{r.totalQty}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Tabla por sucursal */}
          <div className="flex flex-col gap-2">
            <h3 className="font-medium text-sm">Por sucursal</h3>
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sucursal</TableHead>
                    <TableHead className="text-right">Entradas</TableHead>
                    <TableHead className="text-right">Salidas</TableHead>
                    <TableHead className="text-right">Unidades totales</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.byBranch.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        Sin datos
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.byBranch.map((r) => (
                      <TableRow key={r.branchId}>
                        <TableCell className="font-medium text-sm">{r.branchName}</TableCell>
                        <TableCell className="text-sm text-right">{r.entries}</TableCell>
                        <TableCell className="text-sm text-right">{r.exits}</TableCell>
                        <TableCell className="text-sm text-right font-medium">{r.totalQty}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Pie con el rango efectivo */}
          <p className="text-xs text-muted-foreground">
            Rango: {new Date(data.dateRange.from).toLocaleDateString("es")} —{" "}
            {new Date(data.dateRange.to).toLocaleDateString("es")}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Tarjeta resumen ──────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: number;
  sub?: string;
}) {
  return (
    <div className="border rounded-md p-4 flex flex-col gap-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}
