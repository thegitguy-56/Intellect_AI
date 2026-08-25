import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { callBackend } from "@/lib/backend";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const owned = await prisma.patent.findFirst({ where: { id, userId: session.user.id } });
  if (!owned) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const messages = await callBackend(`/patents/${id}/chat`);
  return NextResponse.json({ messages });
}

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

  const body = await request.json().catch(() => null);
  const message: string | undefined = body?.message;
  if (!message?.trim()) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  try {
    const result = await callBackend<{ answer: string; cited_prior_art_ids: string[] }>("/chat", {
      method: "POST",
      body: JSON.stringify({ patent_id: id, user_id: session.user.id, message }),
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "The AI assistant is temporarily unavailable. Please try again shortly." },
      { status: 502 },
    );
  }
}
