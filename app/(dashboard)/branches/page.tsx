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

type Branch = {
  _id: string;
  name: string;
  location: string;
};

// ─── Schema del formulario ────────────────────────────────────────────────────

const branchFormSchema = z.object({
  name:     z.string().min(1, "El nombre es requerido"),
  location: z.string().min(1, "La ubicación es requerida"),
});

type BranchFormData = z.infer<typeof branchFormSchema>;

// ─── Formulario (crear / editar) ──────────────────────────────────────────────

function BranchFormDialog({
  branch,
  onSuccess,
}: {
  branch?: Branch;
  onSuccess: () => void;
}) {
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const isEdit = !!branch;

  const form = useForm<BranchFormData>({
    resolver: zodResolver(branchFormSchema),
    defaultValues: {
      name:     branch?.name     ?? "",
      location: branch?.location ?? "",
    },
  });

  useEffect(() => {
    if (open && branch) {
      form.reset({ name: branch.name, location: branch.location });
    }
    if (open && !branch) {
      form.reset({ name: "", location: "" });
    }
  }, [open, branch, form]);

  const onSubmit = async (data: BranchFormData) => {
    setLoading(true);
    try {
      const res = await fetch(
        isEdit ? `/api/branches/${branch._id}` : "/api/branches",
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

      toast.success(isEdit ? "Sucursal actualizada" : "Sucursal creada");
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
            Nueva sucursal
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar sucursal" : "Nueva sucursal"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

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
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ubicación</FormLabel>
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
                {loading ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear sucursal"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function BranchesPage() {
  const [branches,     setBranches]     = useState<Branch[]>([]);
  const [total,        setTotal]        = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Branch | null>(null);
  const [deleting,     setDeleting]     = useState(false);

  const fetchBranches = useCallback(async () => {
    try {
      const res  = await fetch("/api/branches?limit=100");
      const data = await res.json();
      setBranches(data.data ?? []);
      setTotal(data.total ?? 0);
    } catch {
      toast.error("Error al cargar sucursales");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBranches(); }, [fetchBranches]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/branches/${deleteTarget._id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const result = await res.json();
        toast.error(result.error ?? "Error al eliminar");
        return;
      }
      toast.success("Sucursal eliminada");
      setDeleteTarget(null);
      fetchBranches();
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
          <h2 className="text-xl font-semibold">Sucursales</h2>
          <p className="text-sm text-muted-foreground">{total} en total</p>
        </div>
        <BranchFormDialog onSuccess={fetchBranches} />
      </div>

      <div className="border rounded-md overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Ubicación</TableHead>
              <TableHead className="w-20">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-10">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : branches.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-10">
                  Sin sucursales
                </TableCell>
              </TableRow>
            ) : (
              branches.map((b) => (
                <TableRow key={b._id}>
                  <TableCell className="font-medium text-sm">{b.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{b.location}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <BranchFormDialog branch={b} onSuccess={fetchBranches} />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(b)}
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

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar sucursal?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a eliminar <strong>{deleteTarget?.name}</strong>.
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
