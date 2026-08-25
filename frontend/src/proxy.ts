import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Next.js 16 renamed middleware.ts -> proxy.ts (Proxy now defaults to the
// Node.js runtime, not Edge). Kept split from the Prisma-backed Credentials
// provider in auth.ts anyway — routing decision lives in
// authConfig.callbacks.authorized, no DB access needed here.
const { auth } = NextAuth(authConfig);

export const proxy = auth;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
