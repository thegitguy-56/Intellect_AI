"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ShaderBackground } from "@/components/ShaderBackground";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setSubmitting(false);

    if (result?.error) {
      setError("Invalid email or access token.");
      return;
    }

    router.push("/library");
    router.refresh();
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background text-on-surface selection:bg-primary-container selection:text-on-primary-container">
      <div className="pointer-events-none absolute inset-0 z-0 opacity-60">
        <ShaderBackground />
      </div>

      <div className="relative z-10 flex h-full w-full items-center justify-center p-margin-mobile md:p-margin-desktop">
        <div
          className="flex w-full max-w-[440px] flex-col gap-8 rounded-xl border border-outline-variant p-8 shadow-sm backdrop-blur-2xl md:p-12"
          style={{
            background: "rgba(250, 250, 248, 0.8)",
            boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.5)",
          }}
        >
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-outline-variant bg-surface">
              <span className="material-symbols-outlined text-[32px] text-primary">
                hub
              </span>
            </div>
            <h1 className="text-4xl font-semibold tracking-tight text-on-background">
              IntellectFlow
            </h1>
            <p className="mt-2 font-mono text-sm uppercase tracking-widest text-on-surface-variant">
              Precision-Lab Analytics
            </p>
          </div>

          <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-1">
              <label
                className="font-mono text-sm text-on-surface-variant"
                htmlFor="email"
              >
                Laboratory ID / Email
              </label>
              <input
                id="email"
                type="email"
                required
                placeholder="researcher@institute.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-0 border-b border-outline-variant bg-transparent py-2 font-mono text-[13px] text-on-surface placeholder:text-outline-variant focus:border-primary focus:outline-none focus:ring-0"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label
                  className="font-mono text-sm text-on-surface-variant"
                  htmlFor="password"
                >
                  Access Token
                </label>
                <span className="text-xs font-mono text-outline-variant">
                  min 8 characters
                </span>
              </div>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                placeholder="••••••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-0 border-b border-outline-variant bg-transparent py-2 font-mono text-[13px] text-on-surface placeholder:text-outline-variant focus:border-primary focus:outline-none focus:ring-0"
              />
            </div>

            {error && (
              <p className="rounded-sm border border-error/30 bg-error-container/40 px-3 py-2 font-mono text-xs text-on-error-container">
                {error}
              </p>
            )}

            <div className="mt-4 flex flex-col gap-4">
              <button
                type="submit"
                disabled={submitting}
                className="group flex w-full items-center justify-center gap-2 rounded border border-transparent bg-primary-container py-3 font-mono text-sm font-medium tracking-wide text-on-primary transition-colors hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Initializing…" : "Initialize Session"}
                <span className="material-symbols-outlined text-[18px] transition-transform group-hover:translate-x-1">
                  arrow_forward
                </span>
              </button>
              <Link
                href="/signup"
                className="flex w-full items-center justify-center gap-2 rounded border border-outline-variant bg-transparent py-3 font-mono text-sm font-medium tracking-wide text-primary transition-colors hover:border-primary hover:bg-surface-container-low"
              >
                Create an Account
              </Link>
            </div>
          </form>

          <div className="mt-auto flex items-center justify-between border-t border-outline-variant pt-6">
            <p className="font-mono text-[10px] text-on-surface-variant opacity-60">
              System v0.1.0-alpha
            </p>
            <div className="flex gap-4">
              <span className="font-mono text-[10px] text-on-surface-variant">
                Legal
              </span>
              <span className="font-mono text-[10px] text-on-surface-variant">
                Help
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute left-margin-desktop top-margin-desktop hidden font-mono text-xs text-on-surface-variant opacity-40 md:block">
        SECURE NODE: AUTH-01
      </div>
      <div className="absolute bottom-margin-desktop right-margin-desktop hidden font-mono text-xs text-on-surface-variant opacity-40 md:block">
        STATUS: STANDBY
      </div>
    </div>
  );
}
