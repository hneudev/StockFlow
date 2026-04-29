"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Product = {
  _id: string;
  sku: string;
  name: string;
  price: number;
  category: string;
};

// ─── Schema del formulario ────────────────────────────────────────────────────

const productFormSchema = z.object({
  sku:      z.string().min(1, "El SKU es requerido"),
  name:     z.string().min(1, "El nombre es requerido"),
  price:    z.number().positive("El precio debe ser positivo"),
  category: z.string().min(1, "La categoría es requerida"),
});

type ProductFormData = z.infer<typeof productFormSchema>;

// ─── Formulario (crear / editar) ──────────────────────────────────────────────

function ProductFormDialog({
  product,
  onSuccess,
}: {
  product?: Product;
  onSuccess: () => void;
}) {
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const isEdit = !!product;

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      sku:      product?.sku      ?? "",
      name:     product?.name     ?? "",
      price:    product?.price    ?? 0,
      category: product?.category ?? "",
    },
  });

  // Sincronizar valores cuando se abre el dialog de edición
  useEffect(() => {
    if (open && product) {
      form.reset({
        sku:      product.sku,
        name:     product.name,
        price:    product.price,
        category: product.category,
      });
    }
    if (open && !product) {
      form.reset({ sku: "", name: "", price: 0, category: "" });
    }
  }, [open, product, form]);

  const onSubmit = async (data: ProductFormData) => {
    setLoading(true);
    try {
      const res = await fetch(
        isEdit ? `/api/products/${product._id}` : "/api/products",
        {
          method:  isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(data),
        }
      );
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.error ?? "Error al guardar");
        return;
      }

      toast.success(isEdit ? "Producto actualizado" : "Producto creado");
      setOpen(false);
      onSuccess();
    } catch {
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Nuevo producto
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar producto" : "Nuevo producto"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            <FormField
              control={form.control}
              name="sku"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SKU</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      {...field}
                      onChange={(e) =>
                        field.onChange(e.target.valueAsNumber || 0)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoría</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear producto"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ProductsPage() {
  const [products,       setProducts]       = useState<Product[]>([]);
  const [total,          setTotal]          = useState(0);
  const [loading,        setLoading]        = useState(true);
  const [deleteTarget,   setDeleteTarget]   = useState<Product | null>(null);
  const [deleting,       setDeleting]       = useState(false);

  const fetchProducts = useCallback(async () => {
    try {
      const res  = await fetch("/api/products?limit=100");
      const data = await res.json();
      setProducts(data.data ?? []);
      setTotal(data.total ?? 0);
    } catch {
      toast.error("Error al cargar productos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/products/${deleteTarget._id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const result = await res.json();
        toast.error(result.error ?? "Error al eliminar");
        return;
      }
      toast.success("Producto eliminado");
      setDeleteTarget(null);
      fetchProducts();
    } catch {
      toast.error("Error de conexión");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold">Productos</h2>
          <p className="text-sm text-muted-foreground">{total} en total</p>
        </div>
        <ProductFormDialog onSuccess={fetchProducts} />
      </div>

      <div className="border rounded-md overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead className="w-20">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                  Sin productos
                </TableCell>
              </TableRow>
            ) : (
              products.map((p) => (
                <TableRow key={p._id}>
                  <TableCell className="font-mono text-sm">{p.sku}</TableCell>
                  <TableCell className="text-sm">{p.name}</TableCell>
                  <TableCell className="text-sm text-right">
                    {p.price.toLocaleString("es", {
                      style: "currency",
                      currency: "USD",
                    })}
                  </TableCell>
                  <TableCell className="text-sm">{p.category}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <ProductFormDialog product={p} onSuccess={fetchProducts} />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(p)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog de confirmación de eliminación */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a eliminar <strong>{deleteTarget?.name}</strong> ({deleteTarget?.sku}).
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
