import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildGameDetailsQuery,
  formatReleaseDate,
  gameDetailsSchema,
  screenshotUrl,
} from "../lib/igdb/queries";
import {
  normalizePlayedPage,
  playedGameSchema,
} from "../lib/played-game-schema";

test("details allow missing fields and limit screenshots to three distinct images", () => {
  const empty = gameDetailsSchema.parse({ id: 1, name: "Minimal game" });
  assert.deepEqual(empty.screenshots, []);
  const full = gameDetailsSchema.parse({
    id: 2,
    name: "Game",
    screenshots: ["a", "a", "b", "c", "d"].map((image_id) => ({ image_id })),
  });
  assert.deepEqual(
    full.screenshots.map((shot) => shot.image_id),
    ["a", "b", "c"],
  );
  assert.equal(
    gameDetailsSchema.safeParse({
      id: 1,
      name: "Game",
      screenshots: [{ image_id: "../other-host" }],
    }).success,
    false,
  );
});
test("details request only validated IDs and required fields", () => {
  assert.throws(() => buildGameDetailsQuery(2_147_483_648));
  assert.throws(() => buildGameDetailsQuery(1.5));
  const query = buildGameDetailsQuery(1942);
  for (const field of [
    "summary",
    "rating_count",
    "aggregated_rating",
    "screenshots.image_id",
    "platforms.name",
  ])
    assert.ok(query.includes(field));
  assert.ok(query.includes("where id = 1942; limit 1;"));
});
test("release dates use UTC and missing ratings remain absent", () => {
  assert.equal(formatReleaseDate(1431993600), "19 maja 2015");
  assert.equal(formatReleaseDate(null), "Data premiery nieznana");
  assert.equal(
    gameDetailsSchema.parse({ id: 1, name: "Game" }).rating,
    undefined,
  );
  assert.ok(
    screenshotUrl("shot1", true).includes("/t_screenshot_huge/shot1.jpg"),
  );
});
test("played actions require an explicit state and database-safe ID", () => {
  assert.deepEqual(
    playedGameSchema.parse({ gameId: "1942", played: "false" }),
    { gameId: 1942, played: false },
  );
  for (const input of [
    { gameId: null, played: "true" },
    { gameId: "1942", played: "toggle" },
    { gameId: "2147483648", played: "true" },
  ])
    assert.equal(playedGameSchema.safeParse(input).success, false);
  assert.equal(normalizePlayedPage(["2"]), 1);
  assert.equal(normalizePlayedPage("-1"), 1);
  assert.equal(normalizePlayedPage("2"), 2);
});
