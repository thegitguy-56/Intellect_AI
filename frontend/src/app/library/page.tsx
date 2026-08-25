import { auth } from "@/auth";
import { SignOutButton } from "@/components/SignOutButton";

// Placeholder for the Patent Library screen (Phase 8). For now this just
// proves the auth + middleware flow end-to-end: only a signed-in session
// reaches this page.
export default async function LibraryPage() {
  const session = await auth();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <p className="font-mono text-sm uppercase tracking-wide text-outline">
        Phase 1 — Auth verified
      </p>
      <h1 className="text-3xl font-semibold text-on-background">
        Welcome, {session?.user?.name ?? session?.user?.email}
      </h1>
      <p className="max-w-md text-base text-on-surface-variant">
        The Patent Library screen lands in Phase 8. This route is
        middleware-protected — only a signed-in session can reach it.
      </p>
      <SignOutButton />
    </main>
  );
}
