import type { NextAuthConfig } from "next-auth";

// Edge-safe half of the NextAuth config: no Prisma/bcrypt imports here, so
// this can run in middleware (Edge runtime). The Credentials provider with
// its Prisma-backed authorize() lives in auth.ts (Node runtime) instead.
export const PUBLIC_ROUTES = ["/", "/signup"];

export const authConfig = {
  pages: {
    signIn: "/",
  },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isPublic =
        PUBLIC_ROUTES.includes(request.nextUrl.pathname) ||
        request.nextUrl.pathname.startsWith("/api/auth");
      if (isPublic) return true;
      return !!auth?.user;
    },
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user) session.user.id = token.id as string;
      return session;
    },
  },
} satisfies NextAuthConfig;
