import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizePlayedFilters,
  playedListHref,
  playedListOrder,
  playedListWhere,
} from "../lib/played-game-filters";

test("played filters normalize search and whitelist sorting", () => {
  assert.deepEqual(
    normalizePlayedFilters({
      playedQ: "  Halo  ",
      playedPage: "2",
      playedSort: "rating_asc",
    }),
    { q: "Halo", page: 2, sort: "rating_asc" },
  );
  assert.deepEqual(
    normalizePlayedFilters({
      playedQ: ["Halo"],
      playedPage: "-1",
      playedSort: "__proto__",
    }),
    { q: "", page: 1, sort: "added_desc" },
  );
  assert.equal(
    normalizePlayedFilters({ playedQ: "a".repeat(200) }).q.length,
    100,
  );
});
test("pagination preserves encoded search, ordering and section anchor", () => {
  const href = playedListHref({ q: "D&D 100%", sort: "name_desc", page: 2 });
  const url = new URL(href, "http://localhost");
  assert.equal(url.searchParams.get("playedQ"), "D&D 100%");
  assert.equal(url.searchParams.get("playedSort"), "name_desc");
  assert.equal(url.searchParams.get("playedPage"), "2");
  assert.equal(url.hash, "#played-games");
  assert.equal(
    playedListHref({ q: "", sort: "added_desc", page: 1 }),
    "/dashboard#played-games",
  );
});
test("search always scopes to the session owner and treats LIKE wildcards literally", () => {
  assert.deepEqual(playedListWhere("owner", "100%_\\"), {
    userId: "owner",
    game: { name: { contains: "100\\%\\_\\\\", mode: "insensitive" } },
  });
  assert.deepEqual(playedListWhere("owner", ""), { userId: "owner" });
  assert.equal(
    playedListOrder("rating_desc")[0].rating &&
      typeof playedListOrder("rating_desc")[0].rating,
    "object",
  );
});
