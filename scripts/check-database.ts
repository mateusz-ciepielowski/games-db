import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";
import { assertDatabaseTarget } from "../lib/database-target";
loadEnvConfig(process.cwd());
const db = new PrismaClient();
async function main() {
  try {
    assertDatabaseTarget(process.env.DATABASE_URL);
    const result = await db.$queryRaw<
      { schema: string; database: string }[]
    >`SELECT current_schema() as schema, current_database() as database`;
    console.log("Database connection:", result);
    console.log("Users:", await db.user.count());
  } catch {
    console.error(
      "Database check failed. Verify DATABASE_URL, schema and migrations.",
    );
    process.exitCode = 1;
  } finally {
    await db.$disconnect();
  }
}
void main();
