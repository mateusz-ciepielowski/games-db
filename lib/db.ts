import "server-only";
import { PrismaClient } from "@prisma/client";
import { assertDatabaseTarget } from "@/lib/database-target";

if (process.env.DATABASE_URL) assertDatabaseTarget(process.env.DATABASE_URL);

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
