"use client";

import { useState, useEffect } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { DialogPortal, DialogOverlay } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Package,
  Building2,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "stockflow-welcome-seen";

const sections = [
  {
    Icon: LayoutDashboard,
    name: "Dashboard",
    description: "Vista general de movimientos recientes y stock actual",
  },
  {
    Icon: ArrowLeftRight,
    name: "Movimientos",
    description: "Historial completo con filtros por estado y sucursal",
  },
  {
    Icon: Package,
    name: "Productos",
    description: "Catálogo de productos con SKU, precio y categoría",
  },
  {
    Icon: Building2,
    name: "Sucursales",
    description: "Gestión de puntos de distribución",
  },
  {
    Icon: BarChart3,
    name: "Reportes",
    description: "Totales por tipo de movimiento y sucursal en un rango de fechas",
  },
];

export default function WelcomeModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setOpen(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={() => {}}>
      <DialogPortal>
        {/* Overlay con backdrop blur */}
        <DialogOverlay className="backdrop-blur-sm" />

        <DialogPrimitive.Content
          className={cn(
            "fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%]",
            "w-full max-w-sm grid gap-4 border bg-background p-6 shadow-lg sm:rounded-lg",
            "mx-auto px-4 sm:px-6",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[state=closed]:slide-out-to-left-1/2 data-[state=open]:slide-in-from-left-1/2",
            "data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-top-[48%]"
          )}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          {/* Encabezado */}
          <div className="flex flex-col space-y-1.5">
            <DialogPrimitive.Title className="text-xl font-semibold leading-none tracking-tight">
              Bienvenido a StockFlow
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="text-sm text-muted-foreground">
              Sistema de control de inventario multi-sucursal
            </DialogPrimitive.Description>
          </div>

          {/* Descripción */}
          <p className="text-sm text-muted-foreground leading-relaxed">
            StockFlow permite gestionar el inventario de productos distribuidos
            en múltiples sucursales. Los movimientos se procesan de forma
            asíncrona — al registrar uno verás el cambio de estado en tiempo
            real.
          </p>

          {/* Secciones */}
          <ul className="space-y-3">
            {sections.map(({ Icon, name, description }) => (
              <li key={name} className="flex items-start gap-3">
                <Icon className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <span className="text-sm font-medium">{name}</span>
                  <span className="text-sm text-muted-foreground">
                    {" "}— {description}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          {/* Botón de cierre */}
          <Button className="w-full" onClick={handleClose}>
            Entendido, comenzar
          </Button>

          {/* Nota al pie */}
          <p className="text-xs text-muted-foreground text-center">
            Este modal solo aparece una vez. Puedes revisitar esta información
            en el README del proyecto.
          </p>
        </DialogPrimitive.Content>
      </DialogPortal>
    </DialogPrimitive.Root>
  );
}
