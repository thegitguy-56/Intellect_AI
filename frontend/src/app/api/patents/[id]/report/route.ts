import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { callBackend } from "@/lib/backend";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const owned = await prisma.patent.findFirst({ where: { id, userId: session.user.id } });
  if (!owned) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const sections: string[] | undefined = body?.sections;

  try {
    const result = await callBackend<{ report_id: string; report_url: string }>(
      "/reports/generate",
      {
        method: "POST",
        body: JSON.stringify({ patent_id: id, sections }),
      },
    );
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Report generation failed. Please try again." }, { status: 502 });
  }
}
