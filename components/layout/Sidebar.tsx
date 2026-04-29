"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Package,
  Building2,
  BarChart3,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/",           label: "Dashboard",   Icon: LayoutDashboard },
  { href: "/movements",  label: "Movimientos",  Icon: ArrowLeftRight  },
  { href: "/products",   label: "Productos",    Icon: Package         },
  { href: "/branches",   label: "Sucursales",   Icon: Building2       },
  { href: "/reports",    label: "Reportes",     Icon: BarChart3       },
];

type Props = {
  isOpen?: boolean;
  onClose?: () => void;
};

export default function Sidebar({ isOpen = false, onClose }: Props) {
  const pathname = usePathname();

  return (
    <>
      {/* Backdrop oscuro — solo en móvil cuando el sidebar está abierto */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "w-60 shrink-0 border-r bg-card flex flex-col",
          // En móvil: overlay fijo deslizable desde la izquierda
          "fixed inset-y-0 left-0 z-40 transition-transform duration-200",
          // En desktop: posición estática en el flujo flex, sin transición
          "md:static md:z-auto md:transition-none",
          // Estado abierto/cerrado según prop (md:translate-x-0 siempre gana en desktop)
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="p-4 border-b flex items-center justify-between">
          <span className="text-lg font-bold tracking-tight">StockFlow</span>
          {/* Botón cerrar — solo visible en móvil */}
          <button
            type="button"
            className="md:hidden p-1 rounded hover:bg-accent"
            onClick={onClose}
            aria-label="Cerrar menú"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 p-2 space-y-1">
          {navLinks.map(({ href, label, Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  active
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
