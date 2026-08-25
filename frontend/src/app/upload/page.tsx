"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type DragEvent } from "react";
import { AppShell } from "@/components/AppShell";

type Stage = "idle" | "uploading" | "creating" | "done" | "error";

export default function UploadPage() {
  const router = useRouter();
  const [dragOver, setDragOver] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    setStage("uploading");
    setProgress(5);

    try {
      const presignRes = await fetch("/api/patents/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size }),
      });
      if (!presignRes.ok) {
        const body = await presignRes.json().catch(() => ({}));
        throw new Error(body.error ?? "Could not start upload.");
      }
      const { uploadUrl, r2Key } = await presignRes.json();
      setProgress(25);

      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) throw new Error("Upload to storage failed.");
      setProgress(70);

      setStage("creating");
      const title = file.name.replace(/\.(pdf|docx|txt)$/i, "");
      const createRes = await fetch("/api/patents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, originalFilename: file.name, r2Key }),
      });
      if (!createRes.ok) {
        const body = await createRes.json().catch(() => ({}));
        throw new Error(body.error ?? "Could not create the patent record.");
      }
      const { patent } = await createRes.json();
      setProgress(100);
      setStage("done");

      setTimeout(() => router.push(`/patents/${patent.id}`), 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStage("error");
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }

  const isProcessing = stage === "uploading" || stage === "creating";

  return (
    <AppShell>
      <div className="flex min-h-[calc(100vh-64px)] flex-col items-center justify-center px-margin-mobile">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-2xl font-semibold text-primary">New Analysis</h1>
          <p className="text-on-surface-variant">
            Upload technical documents to map prior-art connections.
          </p>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => !isProcessing && inputRef.current?.click()}
          className={`relative flex h-[400px] w-full max-w-[600px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded border bg-surface/80 backdrop-blur-md transition-all ${
            dragOver ? "border-primary bg-primary/5 shadow-[0_0_20px_rgba(67,56,202,0.1)]" : "border-outline-variant hover:border-primary/50"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,.txt"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />

          {isProcessing && (
            <div className="scanning-beam pointer-events-none absolute left-0 top-0 h-1 w-full" />
          )}

          {!isProcessing && stage !== "done" && (
            <div className="flex flex-col items-center p-8 text-center">
              <span className="material-symbols-outlined mb-4 text-[48px] text-outline">
                upload_file
              </span>
              <p className="mb-2 font-mono text-sm text-on-surface">
                Drag &amp; Drop Technical Documents
              </p>
              <p className="text-xs text-on-surface-variant">
                Supported formats: PDF, TXT, DOCX (Max 50MB)
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  inputRef.current?.click();
                }}
                className="mt-6 rounded bg-primary-container px-6 py-2 font-mono text-sm text-on-primary transition-colors hover:bg-primary"
              >
                Browse Files
              </button>
              {error && <p className="mt-4 font-mono text-xs text-error">{error}</p>}
            </div>
          )}

          {isProcessing && (
            <div className="flex flex-col items-center justify-center bg-surface/90 backdrop-blur-sm">
              <div className="relative mb-6 h-32 w-32">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
                  <circle
                    className="text-surface-variant"
                    cx="60"
                    cy="60"
                    r="54"
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <circle
                    className="text-primary transition-all duration-150"
                    cx="60"
                    cy="60"
                    r="54"
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray="339.292"
                    strokeDashoffset={339.292 - (progress / 100) * 339.292}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-mono font-bold text-primary">{progress}%</span>
                </div>
              </div>
              <p className="animate-pulse font-mono text-sm text-on-surface">
                {stage === "uploading" ? "Uploading to storage…" : "Creating analysis record…"}
              </p>
            </div>
          )}

          {stage === "done" && (
            <div className="flex flex-col items-center gap-2 text-center">
              <span className="material-symbols-outlined text-[48px] text-primary">check_circle</span>
              <p className="font-mono text-sm text-on-surface">Upload complete — opening patent…</p>
            </div>
          )}

          {stage === "error" && !isProcessing && (
            <div className="flex flex-col items-center gap-2 p-8 text-center">
              <span className="material-symbols-outlined text-[40px] text-error">error</span>
              <p className="font-mono text-sm text-error">{error}</p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setStage("idle");
                  setError(null);
                }}
                className="mt-2 rounded border border-outline-variant px-4 py-2 font-mono text-xs text-primary hover:border-primary"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .scanning-beam {
          background: linear-gradient(90deg, transparent, rgba(67, 56, 202, 0.8), transparent);
          box-shadow: 0 0 12px rgba(67, 56, 202, 0.6);
          animation: scan 2s linear infinite;
          z-index: 10;
        }
        @keyframes scan {
          0% { top: 0; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </AppShell>
  );
}
