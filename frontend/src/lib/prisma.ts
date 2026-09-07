import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@/generated/prisma/client";

// Use Neon's WebSocket-based driver (port 443) instead of a raw TCP pg
// connection (port 5432). This avoids the IPv4/IPv6 ETIMEDOUT issue on this
// machine where IPv4 connections to Neon's endpoint time out. Node.js 22+
// ships a native WebSocket global so no extra package is needed.
//
// Note: @prisma/adapter-pg's PrismaPg does an `instanceof pg.Pool` check
// internally and silently misconfigures itself (falling back to
// host=localhost) when handed a @neondatabase/serverless Pool instead —
// @prisma/adapter-neon is the adapter actually built for this driver.
neonConfig.webSocketConstructor = globalThis.WebSocket;

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

