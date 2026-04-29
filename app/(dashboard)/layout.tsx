"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Menu } from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import WelcomeModal from "@/components/dashboard/WelcomeModal";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 overflow-hidden flex flex-col min-w-0">
        {/* Barra superior con hamburger — solo visible en móvil */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b shrink-0">
          <button
            type="button"
            className="p-1.5 rounded-md hover:bg-accent"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold">StockFlow</span>
        </div>

        <div className="flex-1 overflow-auto p-6">{children}</div>
      </main>

      <WelcomeModal />
    </div>
  );
}
