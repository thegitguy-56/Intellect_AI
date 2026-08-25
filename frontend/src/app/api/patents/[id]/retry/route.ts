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

  await prisma.patent.update({ where: { id }, data: { status: "processing" } });

  try {
    await callBackend("/analyze", { method: "POST", body: JSON.stringify({ patent_id: id }) });
  } catch {
    await prisma.patent.update({ where: { id }, data: { status: "error" } });
    return NextResponse.json({ error: "Retry failed" }, { status: 502 });
  }

  return NextResponse.json({ status: "ok" });
}
