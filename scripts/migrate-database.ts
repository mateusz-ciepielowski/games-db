import { loadEnvConfig } from "@next/env";
import { execFileSync } from "node:child_process";
import { assertDatabaseTarget } from "../lib/database-target";
loadEnvConfig(process.cwd());
try {
  assertDatabaseTarget(process.env.DATABASE_URL);
  assertDatabaseTarget(process.env.DIRECT_URL, "DIRECT_URL");
  execFileSync(
    process.execPath,
    [require.resolve("prisma/build/index.js"), "migrate", "deploy"],
    { stdio: "inherit" },
  );
} catch (error) {
  if (error instanceof Error && !("status" in error))
    console.error(error.message);
  process.exitCode = 1;
}
