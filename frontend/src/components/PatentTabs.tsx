"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { key: "", label: "Overview" },
  { key: "analysis", label: "Extracted Data" },
  { key: "prior-art", label: "Prior-Art" },
  { key: "assistant", label: "AI Assistant" },
  { key: "report", label: "Report" },
];

export function PatentTabs({ patentId }: { patentId: string }) {
  const pathname = usePathname();
  const base = `/patents/${patentId}`;

  return (
    <div className="hide-scrollbar mt-8 flex overflow-x-auto border-b border-outline-variant">
      {TABS.map((tab) => {
        const href = tab.key ? `${base}/${tab.key}` : base;
        const active = pathname === href;
        return (
          <Link
            key={tab.key}
            href={href}
            className={`whitespace-nowrap px-6 py-3 font-mono text-sm transition-colors ${
              active
                ? "border-b-2 border-primary text-primary"
                : "text-on-surface-variant hover:text-primary"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
