"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

const STEPS = [
  { key: "init", label: "01_INIT" },
  { key: "org", label: "02_ORG" },
  { key: "deploy", label: "03_DEPLOY" },
] as const;

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function goNext(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goBack() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleDeploy(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong. Try again.");
      setSubmitting(false);
      return;
    }

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setSubmitting(false);

    if (result?.error) {
      setError("Account created — sign in from the login page.");
      return;
    }

    router.push("/library");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen w-full bg-background font-sans text-on-background antialiased selection:bg-primary-container selection:text-white">
      {/* Left Panel: Form Canvas */}
      <main className="relative z-10 flex w-full flex-col justify-between bg-surface p-8 shadow-[4px_0_24px_rgba(0,0,0,0.02)] lg:w-[45%] lg:p-margin-desktop xl:w-[40%]">
        <header className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="material-symbols-outlined text-primary"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              hub
            </span>
            <span className="text-2xl font-bold tracking-tight text-primary">
              IntellectFlow
            </span>
          </div>
          <Link
            href="/"
            className="font-mono text-sm text-on-surface-variant transition-colors hover:text-primary"
          >
            Log In
          </Link>
        </header>

        <section className="mx-auto my-12 w-full max-w-md flex-1 flex-col justify-center">
          {/* Progress Indicator: Circuit Map */}
          <div className="mb-16 flex w-full items-center pt-4">
            {STEPS.map((s, i) => (
              <div key={s.key} className="flex flex-1 items-center last:flex-none">
                <div className="relative flex items-center justify-center">
                  <div
                    className={`z-10 h-3 w-3 rounded-full ${
                      i <= step
                        ? "bg-primary shadow-[0_0_12px_rgba(42,20,180,0.3)]"
                        : "border border-outline-variant bg-surface"
                    }`}
                  />
                  <span
                    className={`absolute top-6 whitespace-nowrap font-mono text-[13px] ${
                      i <= step
                        ? "font-bold text-primary"
                        : "text-outline"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="relative mx-2 h-hairline flex-1 overflow-hidden bg-outline-variant/50">
                    {i < step && (
                      <div className="absolute inset-0 rounded-full bg-primary/60 shadow-[0_0_8px_rgba(42,20,180,0.4)]" />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {step === 0 && (
            <form className="flex flex-col gap-8" onSubmit={goNext}>
              <div className="mb-2">
                <h1 className="mb-2 text-4xl font-semibold text-on-surface">
                  Initialize Instance
                </h1>
                <p className="text-base text-on-surface-variant">
                  Create your analyst credentials to begin mapping prior-art
                  networks.
                </p>
              </div>

              <div className="group relative flex flex-col">
                <label
                  className="mb-3 font-mono text-sm text-on-surface-variant transition-colors group-focus-within:text-primary"
                  htmlFor="email"
                >
                  Researcher ID (Email)
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="analyst@institute.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border-0 border-b border-outline-variant bg-transparent py-2 text-base text-on-surface placeholder:text-outline-variant/60 focus:border focus:border-primary focus:bg-surface/50 focus:outline-none"
                />
              </div>

              <div className="group relative flex flex-col">
                <label
                  className="mb-3 font-mono text-sm text-on-surface-variant transition-colors group-focus-within:text-primary"
                  htmlFor="password"
                >
                  Security Key
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border-0 border-b border-outline-variant bg-transparent py-2 text-base text-on-surface placeholder:text-outline-variant/60 focus:border focus:border-primary focus:bg-surface/50 focus:outline-none"
                />
                <div className="mt-3 flex items-start gap-2 rounded-sm border border-outline-variant/30 bg-surface-container/30 p-3">
                  <span className="material-symbols-outlined text-[16px] text-secondary">
                    info
                  </span>
                  <p className="font-mono text-[13px] leading-tight text-on-surface-variant">
                    Key must be at least 8 characters. Longer, unique
                    passphrases are stronger than short complex ones.
                  </p>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between">
                <Link
                  href="/"
                  className="-ml-4 px-4 py-2 font-mono text-sm text-on-surface-variant transition-colors hover:text-primary"
                >
                  Cancel Process
                </Link>
                <button
                  type="submit"
                  className="group flex items-center gap-2 rounded-lg bg-primary px-8 py-3 font-mono text-sm text-white shadow-sm transition-all hover:bg-primary-container hover:text-on-primary-container hover:shadow-md"
                >
                  Continue
                  <span className="material-symbols-outlined text-[18px] transition-transform group-hover:translate-x-1">
                    arrow_forward
                  </span>
                </button>
              </div>
            </form>
          )}

          {step === 1 && (
            <form className="flex flex-col gap-8" onSubmit={goNext}>
              <div className="mb-2">
                <h1 className="mb-2 text-4xl font-semibold text-on-surface">
                  Analyst Profile
                </h1>
                <p className="text-base text-on-surface-variant">
                  Who should reports and citations be attributed to?
                </p>
              </div>

              <div className="group relative flex flex-col">
                <label
                  className="mb-3 font-mono text-sm text-on-surface-variant transition-colors group-focus-within:text-primary"
                  htmlFor="name"
                >
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  placeholder="Ada Researcher"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border-0 border-b border-outline-variant bg-transparent py-2 text-base text-on-surface placeholder:text-outline-variant/60 focus:border focus:border-primary focus:bg-surface/50 focus:outline-none"
                />
              </div>

              <div className="mt-8 flex items-center justify-between">
                <button
                  type="button"
                  onClick={goBack}
                  className="-ml-4 px-4 py-2 font-mono text-sm text-on-surface-variant transition-colors hover:text-primary"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="group flex items-center gap-2 rounded-lg bg-primary px-8 py-3 font-mono text-sm text-white shadow-sm transition-all hover:bg-primary-container hover:text-on-primary-container hover:shadow-md"
                >
                  Continue
                  <span className="material-symbols-outlined text-[18px] transition-transform group-hover:translate-x-1">
                    arrow_forward
                  </span>
                </button>
              </div>
            </form>
          )}

          {step === 2 && (
            <form className="flex flex-col gap-8" onSubmit={handleDeploy}>
              <div className="mb-2">
                <h1 className="mb-2 text-4xl font-semibold text-on-surface">
                  Deploy Instance
                </h1>
                <p className="text-base text-on-surface-variant">
                  Review your credentials before initializing the account.
                </p>
              </div>

              <dl className="flex flex-col gap-3 rounded-sm border border-outline-variant/40 p-4 font-mono text-[13px]">
                <div className="flex justify-between">
                  <dt className="text-on-surface-variant">Name</dt>
                  <dd className="text-on-surface">{name || "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-on-surface-variant">Email</dt>
                  <dd className="text-on-surface">{email || "—"}</dd>
                </div>
              </dl>

              <label className="flex items-start gap-2 text-sm text-on-surface-variant">
                <input
                  type="checkbox"
                  required
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1"
                />
                I agree to the Data Protocols and Usage Terms.
              </label>

              {error && (
                <p className="rounded-sm border border-error/30 bg-error-container/40 px-3 py-2 font-mono text-xs text-on-error-container">
                  {error}
                </p>
              )}

              <div className="mt-8 flex items-center justify-between">
                <button
                  type="button"
                  onClick={goBack}
                  className="-ml-4 px-4 py-2 font-mono text-sm text-on-surface-variant transition-colors hover:text-primary"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitting || !agreed}
                  className="group flex items-center gap-2 rounded-lg bg-primary px-8 py-3 font-mono text-sm text-white shadow-sm transition-all hover:bg-primary-container hover:text-on-primary-container hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Deploying…" : "Execute Init"}
                  <span className="material-symbols-outlined text-[18px] transition-transform group-hover:translate-x-1">
                    arrow_forward
                  </span>
                </button>
              </div>
            </form>
          )}
        </section>

        <footer className="mt-auto w-full border-t border-outline-variant/40 pt-8 text-center lg:text-left">
          <p className="font-sans text-xs text-outline">
            By initiating, you agree to the{" "}
            <span className="underline">Data Protocols</span> and{" "}
            <span className="underline">Usage Terms</span>.
          </p>
        </footer>
      </main>

      {/* Right Panel: Micro-Illustration & Branding */}
      <aside className="relative hidden flex-1 items-center justify-center overflow-hidden border-l border-outline-variant bg-surface-container-low lg:flex">
        <div
          className="absolute inset-0 h-full w-full opacity-20"
          style={{
            backgroundImage: "radial-gradient(#c7c4d7 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="relative z-10 flex aspect-square w-3/4 max-w-2xl items-center justify-center">
          <svg
            className="absolute inset-0"
            fill="none"
            height="100%"
            viewBox="0 0 400 400"
            width="100%"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M100 200 L200 100 L300 200 L200 300 Z"
              stroke="#c7c4d7"
              strokeDasharray="4 4"
              strokeWidth="1"
            />
            <line stroke="#c7c4d7" strokeWidth="1" x1="50" x2="350" y1="200" y2="200" />
            <line stroke="#c7c4d7" strokeWidth="1" x1="200" x2="200" y1="50" y2="350" />
            <path
              d="M100 200 L200 100"
              stroke="#2a14b4"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              style={{ animation: "flow 2s linear infinite" }}
            />
            <path
              d="M200 100 L300 200"
              stroke="#2a14b4"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              style={{ animation: "flow 2s linear infinite", animationDelay: "0.5s" }}
            />
            <circle cx="200" cy="200" fill="#fcf8ff" r="16" stroke="#2a14b4" strokeWidth="1" />
            <circle cx="200" cy="200" fill="#2a14b4" r="6" />
            <circle
              className="animate-spin"
              cx="200"
              cy="200"
              fill="transparent"
              r="24"
              stroke="#2a14b4"
              strokeDasharray="2 6"
              strokeWidth="1"
              style={{ animationDuration: "8s", transformOrigin: "200px 200px" }}
            />
            <circle cx="100" cy="200" fill="#fcf8ff" r="8" stroke="#777586" strokeWidth="1" />
            <circle cx="300" cy="200" fill="#fcf8ff" r="8" stroke="#777586" strokeWidth="1" />
            <circle cx="200" cy="100" fill="#fcf8ff" r="8" stroke="#2a14b4" strokeWidth="1" />
            <circle cx="200" cy="300" fill="#fcf8ff" r="8" stroke="#777586" strokeWidth="1" />
            <circle cx="150" cy="150" fill="#2a14b4" r="2" />
            <circle cx="250" cy="150" fill="#2a14b4" r="2" />
          </svg>

          <div className="absolute bottom-12 right-12 w-72 rounded-lg border border-white/40 bg-surface/80 p-6 shadow-sm backdrop-blur-xl">
            <div className="mb-3 flex items-center gap-3 border-b border-outline-variant/30 pb-3">
              <span className="material-symbols-outlined text-primary">
                account_tree
              </span>
              <h3 className="text-[18px] font-medium text-on-surface">
                Topology Mapping
              </h3>
            </div>
            <p className="text-[14px] leading-relaxed text-on-surface-variant">
              Instantly visualize complex citation networks and prior-art
              relationships across global patent databases.
            </p>
            <div className="mt-4 flex gap-2 font-mono text-[11px] text-primary">
              <span className="rounded-sm bg-primary-fixed px-2 py-1">
                14M+ Nodes
              </span>
              <span className="rounded-sm bg-primary-fixed px-2 py-1">
                Real-time
              </span>
            </div>
          </div>
        </div>
      </aside>

      <style>{`
        @keyframes flow {
          0% { stroke-dashoffset: 100; }
          100% { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
}
