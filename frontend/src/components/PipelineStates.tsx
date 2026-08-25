"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function ProcessingState() {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(interval);
  }, [router]);

  return (
    <div className="relative flex min-h-[400px] flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface/80 p-8 backdrop-blur-xl">
      <div className="mb-6 flex items-center justify-between border-b border-outline-variant/30 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-pulse rounded-full border border-outline-variant" />
          <span className="font-mono text-sm text-on-surface">Analysis in progress</span>
        </div>
      </div>
      <div className="relative flex flex-1 items-center justify-center">
        <div className="relative h-[150px] w-full max-w-[300px]">
          <div className="absolute left-1/4 top-1/2 h-px w-1/2 -translate-y-1/2 rotate-12 bg-outline-variant/40" />
          <div className="absolute left-1/4 top-1/2 h-px w-1/2 -translate-y-1/2 -rotate-12 bg-outline-variant/40" />
          <div className="absolute left-1/2 top-1/4 h-1/2 w-px -translate-x-1/2 bg-outline-variant/40" />
          <div className="node-pulse absolute left-1/4 top-1/2 z-10 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-primary/30 bg-surface">
            <div className="h-2 w-2 rounded-full bg-primary/20" />
          </div>
          <div className="absolute left-[75%] top-[20%] z-10 h-6 w-6 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full border border-outline-variant bg-surface" />
          <div className="absolute left-[75%] top-[80%] z-10 h-6 w-6 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full border border-outline-variant bg-surface" />
          <div className="absolute left-1/2 top-1/4 z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full border border-outline-variant bg-surface" />
        </div>
      </div>
      <p className="animate-pulse text-center font-mono text-xs uppercase tracking-widest text-outline">
        Extracting text, entities, and computing embeddings…
      </p>
      <style>{`
        .node-pulse { animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes pulse-ring {
          0% { transform: translate(-50%, -50%) scale(0.8); box-shadow: 0 0 0 0 rgba(42, 20, 180, 0.2); }
          70% { transform: translate(-50%, -50%) scale(1); box-shadow: 0 0 0 10px rgba(42, 20, 180, 0); }
          100% { transform: translate(-50%, -50%) scale(0.8); box-shadow: 0 0 0 0 rgba(42, 20, 180, 0); }
        }
      `}</style>
    </div>
  );
}

export function ErrorState({ patentId }: { patentId: string }) {
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);

  async function retry() {
    setRetrying(true);
    await fetch(`/api/patents/${patentId}/retry`, { method: "POST" });
    router.refresh();
    setRetrying(false);
  }

  return (
    <div className="relative flex flex-col overflow-hidden rounded-xl border border-error/20 bg-error-container/10 p-8">
      <div className="relative z-10 flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-error/20 bg-error/10">
          <span className="material-symbols-outlined text-error">warning</span>
        </div>
        <div>
          <h3 className="mb-1 text-xl font-semibold text-on-surface">Analysis Failed</h3>
          <p className="mb-4 text-on-surface-variant">
            The pipeline hit an error while extracting or analyzing this document — it may be
            corrupted, password-protected, or an unsupported format.
          </p>
          <div className="mb-4 inline-block rounded border border-outline-variant bg-surface p-3 shadow-inner">
            <span className="font-mono tracking-wider text-secondary-container">
              ERR_ANALYSIS_PIPELINE
            </span>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={retry}
              disabled={retrying}
              className="rounded border border-outline-variant px-4 py-2 font-mono text-sm text-on-surface transition-colors hover:bg-surface-container-high disabled:opacity-50"
            >
              {retrying ? "Retrying…" : "Retry Analysis"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
