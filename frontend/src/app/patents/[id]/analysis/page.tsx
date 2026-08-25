import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { highlightEntities } from "@/lib/highlight";
import { ProcessingState, ErrorState } from "@/components/PipelineStates";

const LEGEND = [
  { type: "person", label: "Person" },
  { type: "org", label: "Organization" },
  { type: "date", label: "Date" },
  { type: "monetary", label: "Monetary" },
];

const LEGEND_SWATCH: Record<string, string> = {
  person: "bg-primary-fixed border-primary",
  org: "bg-secondary-fixed border-secondary",
  date: "bg-tertiary-fixed border-tertiary",
  monetary: "bg-secondary-container/20 border-secondary-container",
};

export default async function AnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  const patent = await prisma.patent.findFirst({
    where: { id, userId: session!.user.id },
    include: { analysis: true, entities: true },
  });
  if (!patent) notFound();

  if (patent.status === "uploaded" || patent.status === "processing") return <ProcessingState />;
  if (patent.status === "error") return <ErrorState patentId={patent.id} />;

  const fullText = patent.analysis?.extractedText ?? "";
  const highlighted = highlightEntities(
    fullText,
    patent.entities.map((e) => ({
      entityType: e.entityType,
      spanStart: e.spanStart,
      spanEnd: e.spanEnd,
    })),
  );

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
      <section className="relative rounded border border-outline-variant bg-surface-container-lowest p-8 lg:col-span-8">
        <div className="mb-6 flex items-center justify-between border-b border-outline-variant pb-4">
          <h2 className="text-xl font-semibold text-on-surface">Extracted Document</h2>
          <span className="rounded border border-surface-variant bg-surface-container px-3 py-1 font-mono text-sm text-primary">
            {patent.entities.length} entities
          </span>
        </div>
        <div className="max-h-[70vh] overflow-y-auto whitespace-pre-wrap font-sans leading-relaxed text-on-surface-variant">
          {fullText ? highlighted : "No text could be extracted from this document."}
        </div>
      </section>

      <aside className="flex flex-col gap-6 lg:col-span-4">
        <div className="rounded border border-outline-variant bg-surface p-6">
          <h3 className="mb-4 font-mono text-xs uppercase tracking-wider text-outline">Legend</h3>
          <div className="flex flex-col gap-2">
            {LEGEND.map((l) => (
              <div key={l.type} className="flex items-center gap-2 font-mono text-sm">
                <span className={`h-3 w-3 rounded-sm border ${LEGEND_SWATCH[l.type]}`} />
                {l.label}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded border border-outline-variant bg-surface-container-lowest">
          <div className="border-b border-outline-variant p-4">
            <h4 className="font-mono text-xs uppercase tracking-wider text-on-surface">
              Section Splits
            </h4>
          </div>
          <div className="flex flex-col gap-3 p-4 text-sm">
            <SectionRow label="Claims" text={patent.analysis?.claimsText} />
            <SectionRow label="Abstract" text={patent.analysis?.abstractText} />
            <SectionRow label="Background" text={patent.analysis?.backgroundText} />
          </div>
        </div>

        <div className="rounded border border-outline-variant bg-surface-container-lowest">
          <div className="border-b border-outline-variant p-4">
            <h4 className="font-mono text-xs uppercase tracking-wider text-on-surface">
              Entities by Type
            </h4>
          </div>
          <ul className="font-mono text-sm">
            {LEGEND.map((l) => {
              const values = patent.entities.filter((e) => e.entityType === l.type);
              return (
                <li key={l.type} className="border-b border-outline-variant p-3 last:border-b-0">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-on-surface-variant">{l.label}</span>
                    <span className="text-primary">{values.length}</span>
                  </div>
                  {values.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {values.slice(0, 6).map((v) => (
                        <span
                          key={v.id}
                          className="rounded bg-surface-container px-1.5 py-0.5 text-[11px] text-on-surface"
                        >
                          {v.entityValue}
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </aside>
    </div>
  );
}

function SectionRow({ label, text }: { label: string; text: string | null | undefined }) {
  return (
    <div className="flex items-center justify-between border-b border-outline-variant pb-2 last:border-b-0 last:pb-0">
      <span className="text-on-surface-variant">{label}</span>
      <span className={text ? "text-primary" : "text-outline"}>
        {text ? `${text.length.toLocaleString()} chars` : "Not found"}
      </span>
    </div>
  );
}
