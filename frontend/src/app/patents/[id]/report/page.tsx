import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ReportExport } from "@/components/ReportExport";
import { ProcessingState, ErrorState } from "@/components/PipelineStates";

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  const patent = await prisma.patent.findFirst({ where: { id, userId: session!.user.id } });
  if (!patent) notFound();

  if (patent.status === "uploaded" || patent.status === "processing") return <ProcessingState />;
  if (patent.status === "error") return <ErrorState patentId={patent.id} />;

  const reports = await prisma.report.findMany({
    where: { patentId: id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <ReportExport
      patentId={id}
      pastReports={reports.map((r) => ({
        id: r.id,
        createdAt: r.createdAt.toISOString(),
        sectionsIncluded: (r.sectionsIncluded as string[]) ?? [],
      }))}
    />
  );
}
