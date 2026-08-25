import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { callBackend } from "@/lib/backend";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const query: string | undefined = body?.query;
  if (!query?.trim()) {
    return NextResponse.json({ patents: [], corpus: [] });
  }

  const [patents, corpusResult] = await Promise.all([
    prisma.patent.findMany({
      where: {
        userId: session.user.id,
        title: { contains: query, mode: "insensitive" },
      },
      take: 5,
      include: { analysis: true },
    }),
    callBackend<{ results: Array<{ id: string; title: string; source: string; similarity_score: number; snippet: string }> }>(
      "/search",
      { method: "POST", body: JSON.stringify({ query, top_k: 5 }) },
    ).catch(() => ({ results: [] })),
  ]);

  return NextResponse.json({ patents, corpus: corpusResult.results });
}
