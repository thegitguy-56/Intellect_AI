import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ProcessingState, ErrorState } from "@/components/PipelineStates";

export default async function PatentOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const patent = await prisma.patent.findFirst({
    where: { id, userId: session!.user.id },
    include: { analysis: true, entities: true },
  });
  if (!patent) notFound();

  if (patent.status === "uploaded" || patent.status === "processing") {
    return <ProcessingState />;
  }
  if (patent.status === "error") {
    return <ErrorState patentId={patent.id} />;
  }

  const analysis = patent.analysis;
  const entityCounts = patent.entities.reduce<Record<string, number>>((acc, e) => {
    acc[e.entityType] = (acc[e.entityType] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
      <div className="space-y-8 xl:col-span-8">
        <section className="rounded-lg border border-outline-variant bg-surface/80 p-8 backdrop-blur-xl">
          <h3 className="mb-4 flex items-center gap-2 text-xl font-semibold text-on-surface">
            <span className="material-symbols-outlined text-primary">summarize</span>
            Abstract
          </h3>
          <p className="leading-relaxed text-on-surface-variant">
            {analysis?.abstractText || "No abstract section was detected in this document."}
          </p>
        </section>

        <section className="rounded border border-outline-variant bg-surface-container-lowest p-8">
          <h3 className="mb-4 flex items-center gap-2 text-xl font-semibold text-on-surface">
            <span className="material-symbols-outlined text-outline">description</span>
            Background
          </h3>
          <p className="leading-relaxed text-on-surface-variant opacity-90">
            {analysis?.backgroundText || "No background section was detected in this document."}
          </p>
        </section>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Link
            href={`/patents/${patent.id}/analysis`}
            className="rounded border border-outline-variant bg-surface p-4 text-center font-mono text-sm text-primary transition-colors hover:border-primary"
          >
            View Extracted Data →
          </Link>
          <Link
            href={`/patents/${patent.id}/opportunities`}
            className="rounded border border-outline-variant bg-surface p-4 text-center font-mono text-sm text-primary transition-colors hover:border-primary"
          >
            View Gap Map →
          </Link>
          <Link
            href={`/patents/${patent.id}/risk`}
            className="rounded border border-outline-variant bg-surface p-4 text-center font-mono text-sm text-primary transition-colors hover:border-primary"
          >
            View Risk &amp; Compliance →
          </Link>
        </div>
      </div>

      <div className="space-y-6 xl:col-span-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex aspect-square flex-col justify-between border border-outline-variant bg-surface-container-low p-4">
            <span className="font-mono text-xs uppercase tracking-wider text-outline">Entities</span>
            <div className="mt-auto">
              <div className="font-mono text-2xl text-primary">{patent.entities.length}</div>
              <div className="mt-1 text-xs text-on-surface-variant">
                {Object.entries(entityCounts)
                  .map(([type, count]) => `${type}: ${count}`)
                  .join(" · ") || "None extracted"}
              </div>
            </div>
          </div>
          <div className="flex aspect-square flex-col justify-between border border-outline-variant bg-surface-container-low p-4">
            <span className="font-mono text-xs uppercase tracking-wider text-outline">
              Risk Score
            </span>
            <div className="mt-auto">
              <div className="font-mono text-2xl text-on-surface">
                {analysis?.riskScore != null ? Math.round(analysis.riskScore) : "—"}
              </div>
              <div className="mt-1 text-xs text-on-surface-variant">
                Compliance:{" "}
                {analysis?.complianceScore != null ? Math.round(analysis.complianceScore) : "—"}
              </div>
            </div>
          </div>
        </div>

        <div className="border border-outline-variant bg-surface-container-lowest">
          <div className="flex items-center justify-between border-b border-outline-variant p-4">
            <h4 className="font-mono text-xs uppercase tracking-wider text-on-surface">
              Extraction Summary
            </h4>
            <span className="material-symbols-outlined text-sm text-outline">analytics</span>
          </div>
          <ul className="font-mono text-sm">
            <li className="flex items-center justify-between border-b border-outline-variant p-3">
              <span className="text-on-surface-variant">Claims</span>
              <span className={analysis?.claimsText ? "text-primary" : "text-outline"}>
                {analysis?.claimsText ? "Detected" : "Not found"}
              </span>
            </li>
            <li className="flex items-center justify-between border-b border-outline-variant p-3">
              <span className="text-on-surface-variant">Abstract</span>
              <span className={analysis?.abstractText ? "text-primary" : "text-outline"}>
                {analysis?.abstractText ? "Detected" : "Not found"}
              </span>
            </li>
            <li className="flex items-center justify-between p-3">
              <span className="text-on-surface-variant">Background</span>
              <span className={analysis?.backgroundText ? "text-primary" : "text-outline"}>
                {analysis?.backgroundText ? "Detected" : "Not found"}
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
