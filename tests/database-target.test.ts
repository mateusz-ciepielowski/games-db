import { test } from "node:test";
import assert from "node:assert/strict";
import {
  assertDatabaseTarget,
  databaseProjectRef,
} from "../lib/database-target";
test("accepts the new project and private schema", () => {
  assert.doesNotThrow(() =>
    assertDatabaseTarget(
      `postgresql://postgres.${databaseProjectRef}:test@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?schema=games_db`,
    ),
  );
});
test("blocks postle, unrelated hosts and missing schema", () => {
  for (const value of [
    undefined,
    "postgresql://postgres.dvybwmntgxhgnoxvjqdd:test@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?schema=games_db",
    `postgresql://postgres.${databaseProjectRef}:test@evil.example/postgres?schema=games_db`,
    `postgresql://postgres:test@db.${databaseProjectRef}.supabase.co/postgres`,
  ]) {
    assert.throws(() => assertDatabaseTarget(value));
  }
});
