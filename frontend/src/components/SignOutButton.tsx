"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="rounded border border-outline-variant px-4 py-2 font-mono text-sm text-primary transition-colors hover:border-primary hover:bg-surface-container-low"
    >
      Sign out
    </button>
  );
}
