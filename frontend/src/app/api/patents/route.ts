import { NextResponse, after } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { callBackend } from "@/lib/backend";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const patents = await prisma.patent.findMany({
    where: { userId: session.user.id },
    orderBy: { uploadedAt: "desc" },
    include: { analysis: true },
  });

  return NextResponse.json({ patents });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const { title, originalFilename, r2Key } = body ?? {};
  if (!title || !originalFilename || !r2Key) {
    return NextResponse.json(
      { error: "title, originalFilename, and r2Key are required" },
      { status: 400 },
    );
  }

  const patent = await prisma.patent.create({
    data: {
      userId: session.user.id,
      title,
      originalFilename,
      r2Key,
      status: "uploaded",
    },
  });

  // Kick off the analysis pipeline without holding up the upload response —
  // extraction + NER + embeddings + two Groq calls can take well past a
  // typical request timeout, especially with Render's free-tier cold start.
  after(async () => {
    try {
      await callBackend("/analyze", {
        method: "POST",
        body: JSON.stringify({ patent_id: patent.id }),
      });
    } catch {
      await prisma.patent.update({ where: { id: patent.id }, data: { status: "error" } });
    }
  });

  return NextResponse.json({ patent }, { status: 201 });
}
