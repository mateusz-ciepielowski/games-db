import { z } from "zod";

export const PAGE_SIZE = 24;
export const MAX_PAGE = 100;
export const sortOptions = {
  popular: "Popularne",
  rating: "Najwyżej oceniane",
  newest: "Najnowsze premiery",
} as const;
export type GameSort = keyof typeof sortOptions;
export type CatalogParams = { q: string; page: number; sort: GameSort };
type SearchParams = Record<string, string | string[] | undefined>;
export function normalizeCatalogParams(params: SearchParams): CatalogParams {
  const q = (typeof params.q === "string" ? params.q : "")
    .replace(/\p{Cc}/gu, " ")
    .trim()
    .slice(0, 100);
  const page =
    typeof params.page === "string" && /^\d{1,3}$/.test(params.page)
      ? Number(params.page)
      : 1;
  const sort =
    typeof params.sort === "string" && Object.hasOwn(sortOptions, params.sort)
      ? (params.sort as GameSort)
      : "popular";
  return { q, page: Math.max(1, Math.min(page, MAX_PAGE)), sort };
}
export function catalogHref({
  q,
  page = 1,
  sort = "popular",
}: Partial<CatalogParams> = {}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (sort !== "popular") params.set("sort", sort);
  if (page > 1) params.set("page", String(page));
  return params.size ? `/?${params}` : "/";
}
const fields =
  "id,name,slug,cover.image_id,first_release_date,total_rating,total_rating_count,genres.name,platforms.abbreviation,platforms.name";
export function buildGamesQuery({ q, page, sort }: CatalogParams) {
  // JSON quoting prevents a title from injecting additional APICalypse commands.
  const search = q ? `search ${JSON.stringify(q)};` : "";
  const order = q
    ? ""
    : `sort ${sort === "rating" ? "total_rating desc" : sort === "newest" ? "first_release_date desc" : "total_rating_count desc"};`;
  const filters = ["version_parent = null"];
  if (!q) filters.push("cover != null");
  if (!q && sort === "rating") filters.push("total_rating_count >= 50");
  if (!q && sort === "newest")
    filters.push(
      "first_release_date != null",
      `first_release_date <= ${Math.floor(Date.now() / 1000)}`,
    );
  return `fields ${fields}; ${search} where ${filters.join(" & ")}; ${order} limit ${PAGE_SIZE + 1}; offset ${(page - 1) * PAGE_SIZE};`;
}
export const gameSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  slug: z.string().optional(),
  cover: z.object({ image_id: z.string().regex(/^[a-zA-Z0-9_-]+$/) }).nullish(),
  first_release_date: z.number().nullish(),
  total_rating: z.number().nullish(),
  total_rating_count: z.number().nullish(),
  genres: z.array(z.object({ name: z.string() })).optional(),
  platforms: z
    .array(z.object({ name: z.string(), abbreviation: z.string().optional() }))
    .optional(),
});
export type Game = z.infer<typeof gameSchema>;
export const gameDetailsSchema = gameSchema.extend({
  summary: z.string().nullish(),
  rating: z.number().min(0).max(100).nullish(),
  rating_count: z.number().int().nonnegative().nullish(),
  aggregated_rating: z.number().min(0).max(100).nullish(),
  aggregated_rating_count: z.number().int().nonnegative().nullish(),
  screenshots: z
    .array(z.object({ image_id: z.string().regex(/^[a-zA-Z0-9_-]+$/) }))
    .nullish()
    .transform((items) =>
      Array.from(
        new Map((items ?? []).map((item) => [item.image_id, item])).values(),
      ).slice(0, 3),
    ),
});
export type GameDetails = z.infer<typeof gameDetailsSchema>;
export function buildGameDetailsQuery(id: number) {
  if (!Number.isSafeInteger(id) || id < 1 || id > 2_147_483_647)
    throw new Error("Invalid game ID");
  return `fields ${fields},summary,rating,rating_count,aggregated_rating,aggregated_rating_count,screenshots.image_id; where id = ${id}; limit 1;`;
}
export function screenshotUrl(imageId: string, full = false) {
  return `https://images.igdb.com/igdb/image/upload/t_${full ? "screenshot_huge" : "screenshot_big"}/${imageId}.jpg`;
}
export function formatReleaseDate(timestamp: number | null | undefined) {
  return timestamp == null
    ? "Data premiery nieznana"
    : new Intl.DateTimeFormat("pl-PL", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(timestamp * 1000));
}
export function coverUrl(game: Game) {
  return game.cover
    ? `https://images.igdb.com/igdb/image/upload/t_cover_big_2x/${game.cover.image_id}.jpg`
    : null;
}
export function releaseYear(game: Game) {
  return game.first_release_date
    ? new Date(game.first_release_date * 1000).getUTCFullYear()
    : null;
}
