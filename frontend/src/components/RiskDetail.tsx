"use client";

import { useState } from "react";

type Factor = { name: string; score: number; explanation: string };

const SEGMENT_COLORS = ["bg-primary", "bg-secondary-container", "bg-surface-tint", "bg-surface-container-high"];

export function RiskDetail({
  patentId,
  riskScore,
  complianceScore,
}: {
  patentId: string;
  riskScore: number | null;
  complianceScore: number | null;
}) {
  const [factors, setFactors] = useState<Factor[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function loadDetail() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/patents/${patentId}/risk-detail`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load risk detail.");
      setFactors(data.factors ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load risk detail.");
    } finally {
      setLoading(false);
    }
  }

  const total = factors?.reduce((sum, f) => sum + f.score, 0) || 1;

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
      <div className="flex flex-col gap-6 md:col-span-8">
        <div>
          <h1 className="mb-2 text-4xl font-semibold text-on-background">Risk Exposure Breakdown</h1>
          <p className="max-w-2xl text-on-surface-variant">
            Composite risk and compliance scores from the analysis pipeline, with an optional
            AI-generated factor breakdown.
          </p>
        </div>

        <div className="rounded-lg border border-outline-variant bg-surface p-6">
          <div className="mb-4 flex items-end justify-between border-b border-outline-variant pb-4">
            <div>
              <div className="mb-1 font-mono text-xs uppercase text-on-surface-variant">
                Composite Risk Score
              </div>
              <div className="flex items-center gap-2 text-xl font-semibold text-secondary-container">
                <span className="material-symbols-outlined">warning</span>
                {riskScore != null ? `${Math.round(riskScore)} / 100` : "Not yet scored"}
              </div>
            </div>
            <div className="text-right font-mono text-xs text-outline">
              Compliance: {complianceScore != null ? `${Math.round(complianceScore)} / 100` : "—"}
            </div>
          </div>

          {factors && factors.length > 0 && (
            <>
              <div className="mb-2 mt-6 flex h-8 w-full overflow-hidden rounded border border-outline-variant">
                {factors.map((f, i) => (
                  <div
                    key={f.name}
                    className={`h-full ${SEGMENT_COLORS[i % SEGMENT_COLORS.length]}`}
                    style={{ width: `${(f.score / total) * 100}%` }}
                    title={`${f.name}: ${f.score}`}
                  />
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-6 font-mono text-sm">
                {factors.map((f, i) => (
                  <div key={f.name} className="flex items-center gap-2">
                    <div className={`h-3 w-3 rounded-sm border ${SEGMENT_COLORS[i % SEGMENT_COLORS.length]}`} />
                    <span>
                      {f.name} ({f.score})
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {!factors && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <button
                type="button"
                onClick={() => void loadDetail()}
                disabled={loading}
                className="rounded bg-primary px-6 py-2 font-mono text-sm text-on-primary transition-colors hover:bg-primary-container disabled:opacity-50"
              >
                {loading ? "Analyzing…" : "Generate AI Factor Breakdown"}
              </button>
              {error && <p className="font-mono text-xs text-error">{error}</p>}
            </div>
          )}
        </div>

        {factors && (
          <div className="flex flex-col gap-4">
            <h2 className="border-b border-outline-variant pb-2 text-xl font-semibold text-on-background">
              Segment Diagnostics
            </h2>
            {factors.map((f, i) => (
              <div key={f.name} className="rounded-lg border border-outline-variant bg-surface">
                <button
                  type="button"
                  onClick={() => setExpanded(expanded === f.name ? null : f.name)}
                  className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-surface-container-low"
                >
                  <div className="flex items-center gap-4">
                    <div className={`h-4 w-4 rounded-sm border ${SEGMENT_COLORS[i % SEGMENT_COLORS.length]}`} />
                    <div>
                      <div className="text-on-surface">{f.name}</div>
                      <div className="font-mono text-xs text-on-surface-variant">Score: {f.score}</div>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-outline-variant">
                    {expanded === f.name ? "expand_less" : "expand_more"}
                  </span>
                </button>
                {expanded === f.name && (
                  <div className="border-t border-outline-variant bg-surface-container-lowest p-4">
                    <p className="text-on-surface-variant">{f.explanation}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="md:col-span-4">
        <div className="sticky top-8 rounded-lg border border-outline-variant bg-surface-container-low p-6">
          <h3 className="mb-4 text-lg font-semibold text-on-background">About this score</h3>
          <p className="text-sm text-on-surface-variant">
            Risk and compliance scores are generated once, during the analysis pipeline, from the
            patent&apos;s claims, background text, and closest prior-art matches. The detailed
            factor breakdown above is generated on demand and not stored, to keep AI usage
            reserved for when you actually need it.
          </p>
        </div>
      </div>
    </div>
  );
}
