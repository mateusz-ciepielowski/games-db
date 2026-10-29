import { test } from "node:test";
import assert from "node:assert/strict";
import { isUnreleased } from "../lib/game-release";

test("release restriction compares calendar days, including the entire release day", () => {
  const now = new Date("2026-10-29T10:00:00Z");
  assert.equal(isUnreleased(new Date("2026-10-30T00:00:00Z"), now), true);
  assert.equal(isUnreleased(new Date("2026-10-29T23:59:59Z"), now), false);
  assert.equal(isUnreleased(new Date("2026-10-28T00:00:00Z"), now), false);
  assert.equal(isUnreleased(null, now), false);
  assert.equal(isUnreleased(undefined, now), false);
});
test("today follows Warsaw across midnight, summer time and year boundaries", () => {
  assert.equal(
    isUnreleased(
      new Date("2027-01-01T00:00:00Z"),
      new Date("2026-12-31T23:30:00Z"),
    ),
    false,
  );
  assert.equal(
    isUnreleased(
      new Date("2026-07-02T00:00:00Z"),
      new Date("2026-07-01T22:30:00Z"),
    ),
    false,
  );
  assert.equal(
    isUnreleased(
      new Date("2026-07-03T00:00:00Z"),
      new Date("2026-07-01T22:30:00Z"),
    ),
    true,
  );
});
