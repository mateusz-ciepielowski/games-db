import "server-only";
import { createHmac } from "node:crypto";
import { prisma } from "@/lib/db";

export function privateKey(value: string) {
  if (!process.env.AUTH_SECRET) throw new Error("Missing AUTH_SECRET");
  return createHmac("sha256", process.env.AUTH_SECRET)
    .update(value)
    .digest("hex");
}

// Atomic PostgreSQL upsert: shared by every server instance, also under concurrency.
export async function rateLimit(
  scope: string,
  value: string,
  limit = 8,
  minutes = 15,
) {
  const key = privateKey(`${scope}:${value}`);
  const expiresAt = new Date(Date.now() + minutes * 60_000);
  const rows = await prisma.$queryRaw<{ attempts: number }[]>`
    INSERT INTO "AuthRateLimit" ("key", "attempts", "expiresAt") VALUES (${key}, 1, ${expiresAt})
    ON CONFLICT ("key") DO UPDATE SET
      "attempts" = CASE WHEN "AuthRateLimit"."expiresAt" <= NOW() THEN 1 ELSE "AuthRateLimit"."attempts" + 1 END,
      "expiresAt" = CASE WHEN "AuthRateLimit"."expiresAt" <= NOW() THEN ${expiresAt} ELSE "AuthRateLimit"."expiresAt" END
    RETURNING "attempts"`;
  return rows[0].attempts <= limit;
}
