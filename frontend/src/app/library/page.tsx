import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { PatentLibraryGrid } from "@/components/PatentLibraryGrid";

export default async function LibraryPage() {
  const session = await auth();
  const patents = await prisma.patent.findMany({
    where: { userId: session!.user.id },
    orderBy: { uploadedAt: "desc" },
    include: { analysis: { select: { noveltyScore: true, riskScore: true } } },
  });

  return (
    <AppShell>
      <div className="mx-auto flex max-w-[1440px] flex-col gap-8 p-margin-desktop">
        <div>
          <h1 className="mb-2 text-4xl font-semibold text-on-background">Patent Library</h1>
          <p className="text-on-surface-variant">
            Active monitoring dashboard for your uploaded patents.
          </p>
        </div>

        <PatentLibraryGrid
          patents={patents.map((p) => ({
            id: p.id,
            title: p.title,
            status: p.status,
            uploadedAt: p.uploadedAt.toISOString(),
            analysis: p.analysis,
          }))}
        />
      </div>
    </AppShell>
  );
}
