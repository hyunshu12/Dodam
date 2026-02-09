import { cache } from "react";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Creates a new PrismaClient per request.
 * Cloudflare Workers cannot reuse connection pools across requests,
 * so we use React `cache()` to deduplicate within a single request
 * and set `maxUses: 1` to prevent pool reuse.
 */
export const getDb = cache(() => {
  const connectionString = process.env.DATABASE_URL ?? "";
  const adapter = new PrismaPg({ connectionString, maxUses: 1 });
  return new PrismaClient({ adapter });
});

/**
 * Backward-compatible export: calls getDb() so existing `prisma.*` calls
 * continue to work without changing every call-site immediately.
 * In Workers runtime this creates a fresh client per request via cache().
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const db = getDb();
    const value = Reflect.get(db, prop, receiver);
    return typeof value === "function" ? value.bind(db) : value;
  },
});
