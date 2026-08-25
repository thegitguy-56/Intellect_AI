"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { CommandPalette } from "@/components/CommandPalette";

const NAV_ITEMS = [
  { href: "/library", label: "Dashboard", icon: "dashboard" },
  { href: "/analytics", label: "Analytics", icon: "bar_chart" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [paletteOpen, setPaletteOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background font-sans text-on-background">
      <header className="fixed left-0 top-0 z-50 flex h-16 w-full items-center justify-between border-b border-outline-variant bg-surface/80 px-margin-desktop backdrop-blur-xl">
        <div className="flex w-80 shrink-0 items-center gap-2">
          <span className="material-symbols-outlined text-primary">hub</span>
          <span className="text-xl font-bold tracking-tight text-primary">IntellectFlow</span>
        </div>
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="flex w-96 items-center gap-2 rounded border-b border-outline-variant bg-transparent px-2 py-2 text-left font-mono text-sm text-outline transition-colors hover:border-primary"
        >
          <span className="material-symbols-outlined text-[18px]">search</span>
          Search patents, prior-art…
          <kbd className="ml-auto rounded border border-outline-variant bg-surface-container px-1.5 py-0.5 text-[10px]">
            ⌘K
          </kbd>
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => router.refresh()}
            className="rounded p-2 text-on-surface-variant transition-colors hover:bg-surface-container-high/50"
            title="Refresh"
          >
            <span className="material-symbols-outlined">refresh</span>
          </button>
        </div>
      </header>

      <nav className="fixed left-0 top-16 z-40 flex h-[calc(100vh-64px)] w-80 flex-col gap-2 border-r border-outline-variant bg-surface p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-primary">Lab Instance</h2>
          <p className="mt-1 font-mono text-xs text-outline">v0.1.0-alpha</p>
        </div>
        <Link
          href="/upload"
          className="mb-6 flex w-full items-center justify-center gap-2 rounded bg-primary py-3 font-mono text-sm text-on-primary transition-colors hover:bg-primary-container"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Analysis
        </Link>
        <div className="flex flex-1 flex-col gap-2">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  active
                    ? "flex items-center gap-3 border-r-4 border-primary bg-primary-container/10 p-3 font-mono text-sm font-bold text-primary"
                    : "flex items-center gap-3 p-3 font-mono text-sm text-on-surface-variant transition-all hover:bg-surface-container-high hover:text-primary"
                }
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <main className="min-h-screen bg-background pl-80 pt-16">{children}</main>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
