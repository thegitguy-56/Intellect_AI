// instrumentation.ts — runs once before the Next.js server starts handling
// requests. This is the correct place for process-level setup.
//
// Problem: Neon Postgres resolves to both IPv4 and IPv6 addresses. On this
// machine, IPv4 connections to port 5432 time out (likely network/firewall),
// while IPv6 connections succeed. Node.js (and the pg driver inside
// @prisma/adapter-pg) defaults to trying both, non-deterministically hitting
// IPv4 first and timing out. Setting 'ipv6first' fixes the resolution order
// so pg always connects over IPv6 — which works.

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { setDefaultResultOrder } = await import("dns");
    setDefaultResultOrder("ipv6first");
    console.log("[instrumentation] DNS resolution order set to IPv6-first.");
  }
}
