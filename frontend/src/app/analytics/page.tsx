import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";

export default async function AnalyticsPage() {
  const session = await auth();
  const userId = session!.user.id;

  const patents = await prisma.patent.findMany({
    where: { userId },
    orderBy: { uploadedAt: "asc" },
    include: { analysis: true },
  });

  const analyzed = patents.filter((p) => p.analysis?.noveltyScore != null);
  const noveltyAvg =
    analyzed.length > 0
      ? Math.round(analyzed.reduce((s, p) => s + (p.analysis!.noveltyScore ?? 0), 0) / analyzed.length)
      : 0;
  const complianceValues = patents
    .map((p) => p.analysis?.complianceScore)
    .filter((v): v is number => v != null);
  const complianceAvg =
    complianceValues.length > 0
      ? Math.round(complianceValues.reduce((s, v) => s + v, 0) / complianceValues.length)
      : 0;

  const totalMatches = await prisma.similarityResult.count({
    where: { patent: { userId } },
  });

  const recentMatches = await prisma.similarityResult.findMany({
    where: { patent: { userId } },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { priorArt: true, patent: { select: { id: true, title: true } } },
  });

  const chartPoints = analyzed.map((p, i) => ({
    x: analyzed.length > 1 ? (i / (analyzed.length - 1)) * 1000 : 500,
    y: 300 - ((p.analysis!.noveltyScore ?? 0) / 100) * 280 - 10,
  }));
  const pathD =
    chartPoints.length > 0
      ? `M${chartPoints.map((p) => `${p.x},${p.y}`).join(" L")}`
      : "";

  const gaugeOffset = 100 - Math.min(complianceAvg, 100);

  return (
    <AppShell>
      <div className="mx-auto max-w-[1440px] p-margin-desktop">
        <header className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-4xl font-semibold text-on-background">Analytics Overview</h1>
            <p className="mt-2 text-on-surface-variant">
              Aggregate metrics across your {patents.length} uploaded patent
              {patents.length === 1 ? "" : "s"}.
            </p>
          </div>
        </header>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 flex min-h-[400px] flex-col rounded-xl border border-outline-variant bg-surface/80 p-6 backdrop-blur-xl lg:col-span-8">
            <div className="mb-6 flex items-center justify-between border-b border-outline-variant pb-4">
              <h3 className="text-xl font-semibold text-on-background">Novelty Trend</h3>
              <span className="rounded bg-primary-fixed px-2 py-1 font-mono text-sm text-primary">
                {analyzed.length} analyzed
              </span>
            </div>
            <div className="relative flex flex-1 items-end">
              {chartPoints.length > 1 ? (
                <svg className="h-full w-full overflow-visible" viewBox="0 0 1000 300" preserveAspectRatio="none">
                  <line x1="0" x2="1000" y1="50" y2="50" stroke="#e3dfff" strokeDasharray="4" />
                  <line x1="0" x2="1000" y1="150" y2="150" stroke="#e3dfff" strokeDasharray="4" />
                  <line x1="0" x2="1000" y1="250" y2="250" stroke="#e3dfff" strokeDasharray="4" />
                  <path d={pathD} fill="none" stroke="#4338ca" strokeWidth="3" strokeLinecap="round" />
                  {chartPoints.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r="4" fill="#fff" stroke="#4338ca" strokeWidth="2" />
                  ))}
                </svg>
              ) : (
                <p className="w-full text-center text-on-surface-variant">
                  Upload and analyze at least two patents to see a novelty trend.
                </p>
              )}
            </div>
          </div>

          <div className="col-span-12 flex flex-col rounded-xl border border-outline-variant bg-surface/80 p-6 backdrop-blur-xl md:col-span-6 lg:col-span-4">
            <div className="mb-6 border-b border-outline-variant pb-4">
              <h3 className="text-xl font-semibold text-on-background">Compliance Index</h3>
            </div>
            <div className="relative flex flex-1 flex-col items-center justify-center">
              <svg className="w-full max-w-[250px] overflow-visible" viewBox="0 0 100 50">
                <path
                  d="M 10 50 A 40 40 0 0 1 90 50"
                  fill="none"
                  stroke="#e9e5ff"
                  strokeLinecap="round"
                  strokeWidth="8"
                />
                <path
                  d="M 10 50 A 40 40 0 0 1 90 50"
                  fill="none"
                  stroke="#4338ca"
                  strokeLinecap="round"
                  strokeWidth="8"
                  strokeDasharray={`${complianceAvg}, 100`}
                  style={{ strokeDashoffset: 0 }}
                  pathLength={100}
                />
              </svg>
              <div className="absolute bottom-0 flex flex-col items-center text-center">
                <span className="font-mono text-3xl text-primary">{complianceAvg || "—"}</span>
                <span className="font-mono text-sm text-on-surface-variant">
                  {complianceAvg >= 70 ? "Low Risk Profile" : complianceAvg > 0 ? "Needs Review" : "No data yet"}
                </span>
              </div>
              <span className="sr-only">{gaugeOffset}</span>
            </div>
          </div>

          <StatTile label="Prior-Art Matches" value={totalMatches.toLocaleString()} icon="account_tree" />
          <StatTile label="Novelty Avg" value={`${noveltyAvg}`} suffix="/100" icon="lightbulb" />

          <div className="col-span-12 rounded-xl border border-outline-variant bg-surface/80 p-6 backdrop-blur-xl lg:col-span-6">
            <div className="mb-4 flex items-center justify-between border-b border-outline-variant pb-4">
              <h3 className="text-xl font-semibold text-on-background">Recent Vector Matches</h3>
            </div>
            {recentMatches.length === 0 ? (
              <p className="py-6 text-center text-on-surface-variant">No matches yet.</p>
            ) : (
              <div className="flex flex-col">
                {recentMatches.map((m) => (
                  <Link
                    key={m.id}
                    href={`/patents/${m.patent.id}/prior-art`}
                    className="flex items-center justify-between rounded px-2 py-3 transition-colors hover:bg-surface-container/50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-2 w-2 rounded-full bg-secondary-container" />
                      <div>
                        <div className="font-mono text-sm text-on-background">{m.patent.title}</div>
                        <div className="text-xs text-on-surface-variant">{m.priorArt.title}</div>
                      </div>
                    </div>
                    <div className="rounded bg-secondary-container/10 px-2 py-0.5 font-mono text-sm text-secondary">
                      {Math.round(m.similarityScore * 100)}% Match
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function StatTile({
  label,
  value,
  suffix,
  icon,
}: {
  label: string;
  value: string;
  suffix?: string;
  icon: string;
}) {
  return (
    <div className="col-span-12 flex flex-col justify-between rounded-xl border border-outline-variant bg-surface/80 p-6 backdrop-blur-xl sm:col-span-6 lg:col-span-3">
      <div className="mb-4 flex items-start justify-between">
        <span className="font-mono text-xs uppercase tracking-wider text-on-surface-variant">
          {label}
        </span>
        <span className="material-symbols-outlined text-outline">{icon}</span>
      </div>
      <div className="flex items-baseline font-mono text-[40px] font-bold leading-none text-on-background">
        {value}
        {suffix && <span className="ml-1 text-[20px] text-outline">{suffix}</span>}
      </div>
    </div>
  );
}
