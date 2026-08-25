import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { callBackend } from "@/lib/backend";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const owned = await prisma.patent.findFirst({ where: { id, userId: session.user.id } });
  if (!owned) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const detail = await callBackend(`/patents/${id}/risk-detail`);
    return NextResponse.json(detail);
  } catch {
    return NextResponse.json(
      { error: "AI risk analysis is temporarily unavailable. Please try again shortly." },
      { status: 502 },
    );
  }
}
