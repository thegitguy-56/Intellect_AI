import type { NextConfig } from "next";

// instrumentation.ts is enabled by default in Next.js 15+ — no experimental
// flag needed. The file sets DNS resolution order to IPv6-first so the Neon
// Postgres pooler (which resolves to both IPv4 and IPv6) always uses the
// IPv6 path that actually works on this machine.
const nextConfig: NextConfig = {};

export default nextConfig;
