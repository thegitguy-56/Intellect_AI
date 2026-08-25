import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createPresignedUploadUrl } from "@/lib/r2";

const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".txt"];
const MAX_SIZE_BYTES = 50 * 1024 * 1024;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const filename: string | undefined = body?.filename;
  const contentType: string | undefined = body?.contentType;
  const size: number | undefined = body?.size;

  if (!filename || !contentType) {
    return NextResponse.json({ error: "filename and contentType are required" }, { status: 400 });
  }
  if (!ALLOWED_EXTENSIONS.some((ext) => filename.toLowerCase().endsWith(ext))) {
    return NextResponse.json(
      { error: "Unsupported file type. Use PDF, DOCX, or TXT." },
      { status: 400 },
    );
  }
  if (typeof size === "number" && size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "File exceeds the 50MB limit." }, { status: 400 });
  }

  const { uploadUrl, r2Key } = await createPresignedUploadUrl(session.user.id, filename, contentType);
  return NextResponse.json({ uploadUrl, r2Key });
}
