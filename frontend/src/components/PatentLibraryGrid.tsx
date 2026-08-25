"use client";

import Link from "next/link";
import { useState } from "react";
import { NoveltyRing } from "@/components/NoveltyRing";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/format";

type LibraryPatent = {
  id: string;
  title: string;
  status: string;
  uploadedAt: string;
  analysis: { noveltyScore: number | null; riskScore: number | null } | null;
};

const FILTERS = ["All", "Analyzed", "Processing", "High Novelty"] as const;

export function PatentLibraryGrid({ patents }: { patents: LibraryPatent[] }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");

  const filtered = patents.filter((p) => {
    if (filter === "Analyzed") return p.status === "analyzed";
    if (filter === "Processing") return p.status === "processing" || p.status === "uploaded";
    if (filter === "High Novelty") return (p.analysis?.noveltyScore ?? 0) >= 75;
    return true;
  });

  if (patents.length === 0) {
    return (
      <div className="relative flex min-h-[400px] flex-col items-center justify-center overflow-hidden rounded-xl border border-outline-variant bg-surface/80 p-8 text-center backdrop-blur-xl">
        <span className="material-symbols-outlined mb-4 text-[64px] text-outline-variant">
          hub
        </span>
        <h3 className="mb-2 text-xl font-semibold text-on-surface">Notebook is empty</h3>
        <p className="mb-8 max-w-sm text-on-surface-variant">
          No patents have been added to this lab instance yet. Upload your first document to
          begin mapping prior-art connections.
        </p>
        <Link
          href="/upload"
          className="flex items-center gap-2 rounded bg-primary px-6 py-3 font-mono text-sm text-on-primary shadow-[0_2px_10px_rgba(42,20,180,0.2)] transition-colors hover:bg-primary-container"
        >
          <span className="material-symbols-outlined text-[18px]">upload</span>
          Upload your first patent
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-outline-variant bg-surface/80 p-2 backdrop-blur-xl">
        <span className="px-2 font-mono text-sm text-outline">Filters:</span>
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-4 py-1.5 font-mono text-sm transition-colors ${
              filter === f
                ? "border-primary bg-primary text-on-primary"
                : "border-outline-variant bg-surface text-on-surface hover:border-primary"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
        {filtered.map((patent, i) => {
          const large = i === 0;
          return (
            <Link
              key={patent.id}
              href={`/patents/${patent.id}`}
              className={`group relative overflow-hidden rounded-lg border border-outline-variant bg-surface p-6 transition-all hover:border-primary hover:shadow-[0_0_12px_rgba(67,56,202,0.15)] ${
                large ? "md:col-span-8" : "md:col-span-4"
              }`}
            >
              <div className="flex h-full flex-col">
                <div className="mb-4 flex items-start justify-between border-b border-outline-variant pb-4">
                  <StatusBadge status={patent.status} />
                  <span className="font-mono text-xs font-medium tracking-wider text-primary">
                    {patent.id.slice(0, 8).toUpperCase()}
                  </span>
                </div>
                <h3
                  className={`mb-4 text-on-background ${large ? "text-2xl" : "text-lg"} font-semibold`}
                >
                  {patent.title}
                </h3>
                <div className="mt-auto flex items-end justify-between">
                  <span className="font-mono text-xs text-outline">
                    {formatDate(patent.uploadedAt)}
                  </span>
                  {patent.analysis?.noveltyScore != null ? (
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-outline">Novelty</span>
                      <NoveltyRing score={patent.analysis.noveltyScore} size={40} />
                    </div>
                  ) : (
                    <span className="font-mono text-xs text-outline">Pending analysis</span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
