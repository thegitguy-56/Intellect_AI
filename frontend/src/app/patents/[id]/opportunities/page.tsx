import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ProcessingState, ErrorState } from "@/components/PipelineStates";

export default async function OpportunitiesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  const patent = await prisma.patent.findFirst({
    where: { id, userId: session!.user.id },
    include: { analysis: true },
  });
  if (!patent) notFound();

  if (patent.status === "uploaded" || patent.status === "processing") return <ProcessingState />;
  if (patent.status === "error") return <ErrorState patentId={patent.id} />;

  const results = await prisma.similarityResult.findMany({
    where: { patentId: id },
    include: { priorArt: true },
    orderBy: { similarityScore: "desc" },
  });

  const novelty = patent.analysis?.noveltyScore ?? 50;
  // Density = how crowded the prior-art space is around this patent —
  // derived from its similarity matches (real stored data, not synthetic).
  const avgSimilarity =
    results.length > 0
      ? (results.reduce((sum, r) => sum + r.similarityScore, 0) / results.length) * 100
      : 0;

  const whitespaceCount = results.filter((r) => r.similarityScore < 0.5).length;
  const saturatedCount = results.filter((r) => r.similarityScore > 0.9).length;
  const saturatedPct = results.length > 0 ? Math.round((saturatedCount / results.length) * 100) : 0;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="mb-2 text-4xl font-semibold text-on-surface">Gap Map Analysis</h1>
          <p className="max-w-2xl text-on-surface-variant">
            Novelty vs. prior-art density for this patent — the amber zone is where novelty is
            high and prior art is sparse.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded border border-outline-variant bg-surface-container-lowest px-4 py-2">
          <span className="h-2 w-2 rounded-full bg-secondary-container shadow-[0_0_8px_rgba(217,119,6,0.5)]" />
          <span className="font-mono text-sm text-on-surface">Opportunity Zone</span>
        </div>
      </div>

      <div className="relative h-[550px] w-full overflow-hidden border border-outline-variant bg-surface-container-lowest">
        <div className="absolute left-4 top-1/2 z-10 -translate-y-1/2 -rotate-90 whitespace-nowrap font-mono text-xs text-outline">
          <span className="font-bold text-primary">↑</span> Novelty Score
        </div>
        <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 font-mono text-xs text-outline">
          Prior-Art Density <span className="font-bold text-primary">→</span>
        </div>

        <div className="absolute inset-16 border border-secondary-container/20 bg-secondary-container/5">
          <div className="absolute left-2 top-2 flex items-center gap-1 font-mono text-xs text-secondary-container opacity-80">
            <span className="material-symbols-outlined text-[16px]">radar</span> Prime Vector
          </div>
        </div>

        <div className="absolute inset-16">
          {/* Target patent */}
          <div
            className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-secondary-container shadow-[0_0_12px_rgba(217,119,6,0.3)]"
            style={{
              left: `${Math.min(avgSimilarity, 95)}%`,
              top: `${100 - Math.min(novelty, 100)}%`,
            }}
            title={`This patent — novelty ${Math.round(novelty)}, density ${Math.round(avgSimilarity)}`}
          />
          {results.map((r) => (
            <div
              key={r.id}
              className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-outline opacity-60 transition-all hover:scale-150 hover:bg-primary hover:opacity-100"
              style={{
                left: `${Math.min(r.similarityScore * 100, 98)}%`,
                top: `${100 - Math.min((1 - r.similarityScore) * 100 + 20, 95)}%`,
              }}
              title={`${r.priorArt.title} — ${Math.round(r.similarityScore * 100)}% similar`}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <InsightTile
          label="Whitespace Matches"
          icon="bubble_chart"
          value={`${whitespaceCount} identified`}
          detail="Prior-art matches below 50% similarity — the least crowded territory around this patent."
        />
        <InsightTile
          label="Novelty Score"
          icon="lightbulb"
          value={patent.analysis?.noveltyScore != null ? patent.analysis.noveltyScore.toFixed(0) : "—"}
          detail="AI-estimated novelty relative to the retrieved prior art, generated during analysis."
          accent
        />
        <InsightTile
          label="Saturation Warning"
          icon="warning"
          value={`${saturatedPct}% density`}
          detail={
            saturatedCount > 0
              ? `${saturatedCount} matches exceed 90% similarity — this territory is heavily covered by existing prior art.`
              : "No matches exceed 90% similarity — this patent sits in relatively open territory."
          }
        />
      </div>
    </div>
  );
}

function InsightTile({
  label,
  icon,
  value,
  detail,
  accent,
}: {
  label: string;
  icon: string;
  value: string;
  detail: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4 border border-outline-variant bg-surface-container-lowest p-6">
      <div className="flex items-start justify-between border-b border-outline-variant pb-2">
        <span className="font-mono text-sm text-outline">{label}</span>
        <span className={`material-symbols-outlined ${accent ? "text-secondary-container" : "text-primary"}`}>
          {icon}
        </span>
      </div>
      <div>
        <div className="mb-1 text-[32px] text-on-surface">{value}</div>
        <p className="text-sm text-on-surface-variant">{detail}</p>
      </div>
    </div>
  );
}
