import { test } from "node:test";
import assert from "node:assert/strict";
import { gameRatingSchema } from "../lib/played-game-schema";

test("personal ratings accept all integers from 1 to 10", () => {
  for (let rating = 1; rating <= 10; rating++)
    assert.deepEqual(
      gameRatingSchema.parse({ gameId: "1942", rating: String(rating) }),
      { gameId: 1942, rating },
    );
});
test("personal ratings reject missing, fractional, out-of-range and malformed values", () => {
  for (const rating of [
    null,
    undefined,
    "",
    "0",
    "11",
    "-1",
    "5.5",
    "8abc",
    "1e1",
    " 8 ",
  ])
    assert.equal(
      gameRatingSchema.safeParse({ gameId: "1942", rating }).success,
      false,
    );
  assert.equal(
    gameRatingSchema.safeParse({ gameId: "2147483648", rating: "8" }).success,
    false,
  );
});
