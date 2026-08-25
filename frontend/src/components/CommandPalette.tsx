"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type PatentResult = {
  id: string;
  title: string;
  status: string;
  analysis: { noveltyScore: number | null } | null;
};

type CorpusResult = {
  id: string;
  title: string;
  source: string;
  similarity_score: number;
  snippet: string;
};

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const [patents, setPatents] = useState<PatentResult[]>([]);
  const [corpus, setCorpus] = useState<CorpusResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        onOpenChange(true);
      }
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onOpenChange]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) {
      setPatents([]);
      setCorpus([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });
        const data = await res.json();
        setPatents(data.patents ?? []);
        setCorpus(data.corpus ?? []);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  if (!open) return null;

  const totalResults = patents.length + corpus.length;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-surface-variant/30 pt-24 backdrop-blur-md"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="flex w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center border-b border-outline-variant px-6 py-4">
          <span className="material-symbols-outlined text-[24px] text-outline">search</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="ml-4 w-full border-none bg-transparent text-xl text-on-surface placeholder:text-outline-variant focus:outline-none focus:ring-0"
            placeholder="Search patents or the prior-art corpus…"
          />
          <kbd className="ml-4 rounded border border-outline-variant bg-surface-container px-2 py-1 font-mono text-xs text-outline">
            esc
          </kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto bg-surface-container-lowest p-2">
          {loading && (
            <p className="px-4 py-6 text-center font-mono text-xs text-outline">Searching…</p>
          )}

          {!loading && query.trim() && totalResults === 0 && (
            <p className="px-4 py-6 text-center font-mono text-xs text-outline">No matches found.</p>
          )}

          {patents.length > 0 && (
            <div className="mb-4">
              <div className="px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-outline">
                My Patents
              </div>
              <ul className="flex flex-col gap-1">
                {patents.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/patents/${p.id}`}
                      onClick={() => onOpenChange(false)}
                      className="mx-2 flex items-center rounded px-4 py-3 transition-colors hover:bg-surface-container-high"
                    >
                      <span className="material-symbols-outlined mr-3 text-outline-variant">
                        description
                      </span>
                      <div className="flex flex-1 flex-col">
                        <span className="truncate text-on-surface">{p.title}</span>
                        <span className="truncate font-mono text-[12px] text-outline">
                          {p.status}
                          {p.analysis?.noveltyScore != null &&
                            ` • Novelty ${p.analysis.noveltyScore.toFixed(0)}`}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {corpus.length > 0 && (
            <div className="mb-2">
              <div className="px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-outline">
                Prior-Art Corpus
              </div>
              <ul className="flex flex-col gap-1">
                {corpus.map((c) => (
                  <li key={c.id}>
                    <div className="mx-2 flex items-center rounded px-4 py-3 transition-colors hover:bg-surface-container-high">
                      <span className="material-symbols-outlined mr-3 text-secondary-container">
                        hub
                      </span>
                      <div className="flex flex-1 flex-col">
                        <span className="truncate text-on-surface">{c.title}</span>
                        <span className="truncate font-mono text-[12px] text-outline">
                          {c.snippet}
                        </span>
                      </div>
                      <span className="ml-3 shrink-0 rounded border border-secondary-container/30 bg-secondary-container/10 px-2 py-0.5 font-mono text-[11px] text-secondary-container">
                        {(c.similarity_score * 100).toFixed(0)}%
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-outline-variant bg-surface px-4 py-3">
          <div className="flex items-center gap-4 font-mono text-[11px] text-outline">
            <span>↑↓ to navigate</span>
            <span>↵ to select</span>
          </div>
          <div className="font-mono text-xs text-outline">{totalResults} results</div>
        </div>
      </div>
    </div>
  );
}
