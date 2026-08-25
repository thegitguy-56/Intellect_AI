import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { RiskDetail } from "@/components/RiskDetail";
import { ProcessingState, ErrorState } from "@/components/PipelineStates";

export default async function RiskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  const patent = await prisma.patent.findFirst({
    where: { id, userId: session!.user.id },
    include: { analysis: true },
  });
  if (!patent) notFound();

  if (patent.status === "uploaded" || patent.status === "processing") return <ProcessingState />;
  if (patent.status === "error") return <ErrorState patentId={patent.id} />;

  return (
    <RiskDetail
      patentId={patent.id}
      riskScore={patent.analysis?.riskScore ?? null}
      complianceScore={patent.analysis?.complianceScore ?? null}
    />
  );
}
