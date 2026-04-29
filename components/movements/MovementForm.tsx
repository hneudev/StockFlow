"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Product = { _id: string; name: string; sku: string };
type Branch  = { _id: string; name: string };

// ─── Schema local del formulario ─────────────────────────────────────────────
// La validación condicional por tipo se hace en onSubmit para mayor claridad

const movementFormSchema = z.object({
  type:         z.enum(["entry", "exit", "transfer"]),
  productId:    z.string().min(1, "Selecciona un producto"),
  fromBranchId: z.string().optional(),
  toBranchId:   z.string().optional(),
  quantity:     z.number().int().min(1, "La cantidad debe ser al menos 1"),
});

type MovementFormData = z.infer<typeof movementFormSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  onSuccess?: () => void;
};

// ─── Componente ───────────────────────────────────────────────────────────────

export default function MovementForm({ onSuccess }: Props) {
  const [open,     setOpen]     = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading,  setLoading]  = useState(false);

  const form = useForm<MovementFormData>({
    resolver: zodResolver(movementFormSchema),
    defaultValues: {
      type:         "entry",
      productId:    "",
      fromBranchId: "",
      toBranchId:   "",
      quantity:     1,
    },
  });

  const type = form.watch("type");

  // Cargar productos y sucursales al abrir el dialog
  useEffect(() => {
    if (!open) return;
    Promise.all([
      fetch("/api/products?limit=100").then((r) => r.json()),
      fetch("/api/branches?limit=100").then((r) => r.json()),
    ]).then(([p, b]) => {
      setProducts(p.data ?? []);
      setBranches(b.data ?? []);
    });
  }, [open]);

  // Limpiar campos ocultos al cambiar de tipo para no enviar datos residuales
  useEffect(() => {
    if (type === "entry")  form.setValue("fromBranchId", "");
    if (type === "exit")   form.setValue("toBranchId",   "");
  }, [type, form]);

  const onSubmit = async (data: MovementFormData) => {
    // Validación adicional de campos condicionales
    if ((data.type === "exit" || data.type === "transfer") && !data.fromBranchId) {
      form.setError("fromBranchId", { message: "Sucursal origen requerida" });
      return;
    }
    if ((data.type === "entry" || data.type === "transfer") && !data.toBranchId) {
      form.setError("toBranchId", { message: "Sucursal destino requerida" });
      return;
    }
    if (
      data.type === "transfer" &&
      data.fromBranchId === data.toBranchId
    ) {
      form.setError("toBranchId", { message: "Origen y destino deben ser distintos" });
      return;
    }

    // Construir el payload exacto que espera la API
    const body: Record<string, unknown> = {
      type:      data.type,
      productId: data.productId,
      quantity:  data.quantity,
    };
    if (data.type === "entry")    body.toBranchId   = data.toBranchId;
    if (data.type === "exit")     body.fromBranchId = data.fromBranchId;
    if (data.type === "transfer") {
      body.fromBranchId = data.fromBranchId;
      body.toBranchId   = data.toBranchId;
    }

    setLoading(true);
    try {
      const res    = await fetch("/api/movements", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.error ?? "Error al crear el movimiento");
        return;
      }

      toast.success("Movimiento creado — procesando...");
      form.reset();
      setOpen(false);
      onSuccess?.();
    } catch {
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Nuevo movimiento
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo movimiento</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            {/* Tipo */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="entry">Entrada</SelectItem>
                      <SelectItem value="exit">Salida</SelectItem>
                      <SelectItem value="transfer">Transferencia</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Producto */}
            <FormField
              control={form.control}
              name="productId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Producto</FormLabel>
                  <Select
                    value={field.value || undefined}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un producto" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p._id} value={p._id}>
                          {p.sku} — {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Sucursal origen (exit, transfer) */}
            {(type === "exit" || type === "transfer") && (
              <FormField
                control={form.control}
                name="fromBranchId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sucursal origen</FormLabel>
                    <Select
                      value={field.value || undefined}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona sucursal" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {branches.map((b) => (
                          <SelectItem key={b._id} value={b._id}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Sucursal destino (entry, transfer) */}
            {(type === "entry" || type === "transfer") && (
              <FormField
                control={form.control}
                name="toBranchId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sucursal destino</FormLabel>
                    <Select
                      value={field.value || undefined}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona sucursal" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {branches.map((b) => (
                          <SelectItem key={b._id} value={b._id}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Cantidad */}
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cantidad</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      {...field}
                      onChange={(e) =>
                        field.onChange(e.target.valueAsNumber || 1)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creando..." : "Crear movimiento"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
