"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Package,
  Building2,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/dashboard",  label: "Dashboard",   Icon: LayoutDashboard },
  { href: "/movements",  label: "Movimientos",  Icon: ArrowLeftRight  },
  { href: "/products",   label: "Productos",    Icon: Package         },
  { href: "/branches",   label: "Sucursales",   Icon: Building2       },
  { href: "/reports",    label: "Reportes",     Icon: BarChart3       },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 border-r bg-card flex flex-col">
      <div className="p-4 border-b">
        <span className="text-lg font-bold tracking-tight">StockFlow</span>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {navLinks.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
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
  );
}
