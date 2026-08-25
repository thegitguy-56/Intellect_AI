import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { PatentTabs } from "@/components/PatentTabs";
import { StatusBadge } from "@/components/StatusBadge";
import { NoveltyRing } from "@/components/NoveltyRing";
import { formatDate } from "@/lib/format";

export default async function PatentLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const patent = await prisma.patent.findFirst({
    where: { id, userId: session!.user.id },
    include: { analysis: { select: { noveltyScore: true } } },
  });

  if (!patent) notFound();

  return (
    <AppShell>
      <div className="border-b border-outline-variant bg-surface-container-lowest px-margin-desktop py-8">
        <div className="mx-auto flex max-w-[1440px] flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-3">
              <span className="rounded bg-primary-container/10 px-2 py-1 font-mono text-sm text-primary">
                {patent.id.slice(0, 8).toUpperCase()}
              </span>
              <StatusBadge status={patent.status} />
            </div>
            <h1 className="max-w-4xl text-4xl font-semibold text-on-background">{patent.title}</h1>
            <p className="mt-4 max-w-2xl text-on-surface-variant">
              Original file: <span className="font-mono">{patent.originalFilename}</span> ·
              Uploaded {formatDate(patent.uploadedAt)}
            </p>
          </div>
          <div className="flex min-w-[160px] flex-col items-center rounded border border-outline-variant bg-surface-container-low p-4">
            <NoveltyRing score={patent.analysis?.noveltyScore ?? null} />
            <span className="mt-2 font-mono text-sm text-on-surface-variant">Novelty Score</span>
          </div>
        </div>
        <div className="mx-auto max-w-[1440px]">
          <PatentTabs patentId={patent.id} />
        </div>
      </div>
      <div className="mx-auto max-w-[1440px] px-margin-desktop py-8">{children}</div>
    </AppShell>
  );
}
