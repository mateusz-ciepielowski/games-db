import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildGamesQuery,
  buildGameDetailsQuery,
  catalogHref,
  coverUrl,
  normalizeCatalogParams,
  PAGE_SIZE,
} from "../lib/igdb/queries";

test("catalog params bound page and search length and reject arbitrary sorting", () => {
  assert.deepEqual(
    normalizeCatalogParams({ q: "  Halo  ", page: "0", sort: "DROP TABLE" }),
    { q: "Halo", page: 1, sort: "popular" },
  );
  assert.equal(normalizeCatalogParams({ page: "999" }).page, 100);
  assert.equal(normalizeCatalogParams({ page: "1e3" }).page, 1);
  assert.equal(normalizeCatalogParams({ q: "a".repeat(200) }).q.length, 100);
  assert.equal(normalizeCatalogParams({ q: ["Halo", "Zelda"] }).q, "");
});
test("search is quoted and does not add sorting that conflicts with relevance", () => {
  const q = 'Halo"; limit 500; \\';
  const query = buildGamesQuery({ q, page: 2, sort: "popular" });
  assert.ok(query.includes(`search ${JSON.stringify(q)};`));
  assert.ok(query.includes(`limit ${PAGE_SIZE + 1}; offset ${PAGE_SIZE};`));
  assert.ok(!query.includes("sort "));
});
test("pagination links retain title and sorting and omit defaults", () => {
  assert.equal(catalogHref(), "/");
  const link = new URL(
    catalogHref({ q: "D&D", page: 2, sort: "rating" }),
    "http://localhost",
  );
  assert.equal(link.searchParams.get("q"), "D&D");
  assert.equal(link.searchParams.get("page"), "2");
  assert.equal(link.searchParams.get("sort"), "rating");
});
test("game IDs are strictly numeric and image URLs use the IGDB image host", () => {
  assert.throws(() => buildGameDetailsQuery(NaN));
  assert.throws(() => buildGameDetailsQuery(-1));
  assert.equal(coverUrl({ id: 1, name: "Test" }), null);
  assert.equal(
    coverUrl({ id: 1, name: "Test", cover: { image_id: "co1234" } }),
    "https://images.igdb.com/igdb/image/upload/t_cover_big_2x/co1234.jpg",
  );
});
