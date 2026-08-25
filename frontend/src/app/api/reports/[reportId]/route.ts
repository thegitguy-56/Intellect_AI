import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createPresignedDownloadUrl } from "@/lib/r2";

export async function GET(_request: Request, { params }: { params: Promise<{ reportId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { reportId } = await params;
  const report = await prisma.report.findFirst({
    where: { id: reportId, patent: { userId: session.user.id } },
  });
  if (!report?.reportUrl) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // report.reportUrl stores the R2 object key (see backend reports router) —
  // generate a fresh, short-lived presigned GET URL on every view.
  const url = await createPresignedDownloadUrl(report.reportUrl);
  return NextResponse.redirect(url);
}
