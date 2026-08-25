import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ChatPanel } from "@/components/ChatPanel";
import { ProcessingState, ErrorState } from "@/components/PipelineStates";

export default async function AssistantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  const patent = await prisma.patent.findFirst({ where: { id, userId: session!.user.id } });
  if (!patent) notFound();

  if (patent.status === "uploaded" || patent.status === "processing") return <ProcessingState />;
  if (patent.status === "error") return <ErrorState patentId={patent.id} />;

  return <ChatPanel patentId={patent.id} />;
}
