import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ProcessingState, ErrorState } from "@/components/PipelineStates";

function positionFor(index: number, total: number, similarity: number) {
  // Higher similarity -> closer to the center. Spread nodes evenly around
  // the circle so they don't overlap.
  const angle = (index / Math.max(total, 1)) * 2 * Math.PI;
  const distance = 60 + (1 - similarity) * 260;
  return {
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance,
  };
}

export default async function PriorArtPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  const patent = await prisma.patent.findFirst({ where: { id, userId: session!.user.id } });
  if (!patent) notFound();

  if (patent.status === "uploaded" || patent.status === "processing") return <ProcessingState />;
  if (patent.status === "error") return <ErrorState patentId={patent.id} />;

  const results = await prisma.similarityResult.findMany({
    where: { patentId: id },
    include: { priorArt: true },
    orderBy: { similarityScore: "desc" },
    take: 10,
  });

  if (results.length === 0) {
    return (
      <div className="flex min-h-[500px] flex-col items-center justify-center rounded-xl border border-outline-variant bg-surface/80 p-8 text-center backdrop-blur-xl">
        <span className="material-symbols-outlined mb-4 text-[48px] text-outline-variant">
          account_tree
        </span>
        <h3 className="mb-2 text-xl font-semibold text-on-surface">No prior art matched</h3>
        <p className="max-w-sm text-on-surface-variant">
          No entries in the prior-art corpus matched this patent above the similarity threshold.
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-[650px] w-full overflow-hidden rounded border border-outline-variant bg-surface-container-lowest">
      <div className="absolute left-6 top-6 z-30 w-72 rounded-lg border border-outline-variant/30 bg-surface/80 p-4 backdrop-blur-xl">
        <h3 className="mb-2 border-b border-outline-variant/50 pb-2 text-sm font-semibold text-on-background">
          Similarity Map
        </h3>
        <p className="font-mono text-xs text-outline">
          Closer to center = higher semantic similarity to this patent&apos;s claims.
        </p>
      </div>

      <div className="absolute bottom-6 right-6 z-30 flex flex-col gap-2 rounded-lg border border-outline-variant/30 bg-surface/80 p-4 backdrop-blur-xl">
        <h4 className="mb-1 border-b border-outline-variant/50 pb-1 font-mono text-xs text-outline">
          Similarity Index
        </h4>
        <LegendLine color="border-primary-container" label="> 90% Match" />
        <LegendLine color="border-outline border-dashed" label="70% - 90%" />
        <LegendLine color="border-outline-variant border-dotted" label="< 70%" />
      </div>

      {[300, 500, 700].map((size, i) => (
        <div
          key={size}
          className="absolute left-1/2 top-1/2 rounded-full border border-dashed border-outline-variant/40"
          style={{ width: size, height: size, transform: "translate(-50%, -50%)" }}
        >
          <span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 bg-surface-container-lowest px-1 font-mono text-[10px] text-outline">
            {[90, 70, 50][i]}%
          </span>
        </div>
      ))}

      <svg className="absolute inset-0 h-full w-full" style={{ zIndex: 5 }}>
        {results.map((r, i) => {
          const { x, y } = positionFor(i, results.length, r.similarityScore);
          const strong = r.similarityScore > 0.9;
          return (
            <line
              key={r.id}
              x1="50%"
              y1="50%"
              x2={`calc(50% + ${x}px)`}
              y2={`calc(50% + ${y}px)`}
              stroke={strong ? "#4338ca" : "#c7c4d7"}
              strokeWidth={strong ? 1.5 : 1}
              strokeDasharray={strong ? undefined : "4 4"}
              opacity={0.6}
            />
          );
        })}
      </svg>

      <div
        className="absolute left-1/2 top-1/2 z-40 w-64 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-primary-container bg-surface p-4 shadow-sm"
      >
        <div className="mb-2 flex items-start justify-between border-b border-outline-variant pb-2">
          <span className="font-mono text-xs font-bold text-primary">TARGET PATENT</span>
          <span className="rounded bg-primary-container/10 px-1 font-mono text-xs text-primary">
            {patent.id.slice(0, 8).toUpperCase()}
          </span>
        </div>
        <h3 className="mb-2 line-clamp-2 text-sm font-semibold">{patent.title}</h3>
      </div>

      {results.map((r, i) => {
        const { x, y } = positionFor(i, results.length, r.similarityScore);
        const strong = r.similarityScore > 0.9;
        return (
          <div
            key={r.id}
            className="absolute z-20 w-48 -translate-x-1/2 -translate-y-1/2 rounded border bg-surface p-3 shadow-sm transition-transform hover:z-30 hover:scale-105"
            style={{
              left: `calc(50% + ${x}px)`,
              top: `calc(50% + ${y}px)`,
              borderColor: strong ? "#4338ca" : "#c7c4d7",
              borderWidth: strong ? 2 : 1,
            }}
          >
            <div className="mb-2 flex items-center justify-between border-b border-outline-variant/50 pb-1">
              <span className="font-mono text-[10px] text-outline">
                {r.priorArt.id.slice(0, 8).toUpperCase()}
              </span>
              <span
                className={`rounded px-1 font-mono text-[10px] font-bold ${
                  strong
                    ? "bg-secondary-container/20 text-secondary"
                    : "bg-surface-container-high text-on-surface-variant"
                }`}
              >
                {Math.round(r.similarityScore * 100)}%
              </span>
            </div>
            <h4 className="line-clamp-2 text-xs font-medium text-on-background">
              {r.priorArt.title}
            </h4>
          </div>
        );
      })}
    </div>
  );
}

function LegendLine({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-4 border-t-2 ${color}`} />
      <span className="font-mono text-[10px]">{label}</span>
    </div>
  );
}
