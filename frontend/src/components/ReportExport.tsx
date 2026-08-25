"use client";

import { useState } from "react";
import { formatDate } from "@/lib/format";

const SECTION_OPTIONS = [
  { key: "summary", label: "Summary & Scores" },
  { key: "entities", label: "Extracted Entities" },
  { key: "prior_art", label: "Prior-Art Matches" },
  { key: "risk_compliance", label: "Risk & Compliance" },
  { key: "recommendations", label: "Recommendations" },
];

type PastReport = { id: string; createdAt: string; sectionsIncluded: string[] };

export function ReportExport({
  patentId,
  pastReports,
}: {
  patentId: string;
  pastReports: PastReport[];
}) {
  const [sections, setSections] = useState<string[]>(SECTION_OPTIONS.map((s) => s.key));
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ report_url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggle(key: string) {
    setSections((prev) => (prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]));
  }

  async function generate() {
    setGenerating(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/patents/${patentId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Report generation failed.");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Report generation failed.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
      <div className="lg:col-span-8">
        <div className="rounded border border-outline-variant bg-surface-container-lowest p-8">
          <h3 className="mb-6 border-b border-outline-variant pb-4 text-xl font-semibold text-on-surface">
            Live Preview
          </h3>
          {result ? (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <span className="material-symbols-outlined text-[48px] text-primary">
                task_alt
              </span>
              <p className="text-on-surface-variant">Report generated successfully.</p>
              <a
                href={result.report_url}
                target="_blank"
                rel="noreferrer"
                className="rounded bg-primary px-6 py-2 font-mono text-sm text-on-primary transition-colors hover:bg-primary-container"
              >
                Download PDF
              </a>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-16 text-center text-on-surface-variant">
              <span className="material-symbols-outlined text-[40px] text-outline-variant">
                description
              </span>
              <p>Select sections and generate a report to preview the export here.</p>
            </div>
          )}
          {error && <p className="mt-4 font-mono text-xs text-error">{error}</p>}
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:col-span-4">
        <div className="rounded border border-outline-variant bg-surface p-6">
          <h4 className="mb-4 font-mono text-xs uppercase tracking-wider text-outline">
            Sections to include
          </h4>
          <div className="flex flex-col gap-3">
            {SECTION_OPTIONS.map((s) => (
              <label key={s.key} className="flex items-center gap-2 text-sm text-on-surface">
                <input
                  type="checkbox"
                  checked={sections.includes(s.key)}
                  onChange={() => toggle(s.key)}
                />
                {s.label}
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void generate()}
            disabled={generating || sections.length === 0}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded bg-primary py-3 font-mono text-sm text-on-primary transition-colors hover:bg-primary-container disabled:opacity-50"
          >
            {generating ? "Exporting…" : "Generate Report"}
            <span className="material-symbols-outlined text-[18px]">summarize</span>
          </button>
        </div>

        {pastReports.length > 0 && (
          <div className="rounded border border-outline-variant bg-surface-container-lowest">
            <div className="border-b border-outline-variant p-4">
              <h4 className="font-mono text-xs uppercase tracking-wider text-on-surface">
                Past Exports
              </h4>
            </div>
            <ul className="font-mono text-sm">
              {pastReports.map((r) => (
                <li key={r.id} className="flex items-center justify-between border-b border-outline-variant p-3 last:border-b-0">
                  <span className="text-on-surface-variant">
                    {formatDate(r.createdAt)}
                  </span>
                  <a href={`/api/reports/${r.id}`} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                    View
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
