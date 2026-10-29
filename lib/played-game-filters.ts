import type { Prisma } from "@prisma/client";
import { normalizePlayedPage } from "./played-game-schema";

export const playedSortOptions = {
  added_desc: "Data dodania: od najnowszych",
  added_asc: "Data dodania: od najstarszych",
  rating_desc: "Twoja ocena: od najwyższej",
  rating_asc: "Twoja ocena: od najniższej",
  name_asc: "Nazwa: A–Z",
  name_desc: "Nazwa: Z–A",
} as const;
export type PlayedSort = keyof typeof playedSortOptions;
export type PlayedFilters = { q: string; sort: PlayedSort; page: number };
export function normalizePlayedFilters(
  params: Record<string, string | string[] | undefined>,
): PlayedFilters {
  return {
    q: (typeof params.playedQ === "string" ? params.playedQ : "")
      .replace(/\p{Cc}/gu, " ")
      .trim()
      .slice(0, 100),
    sort:
      typeof params.playedSort === "string" &&
      Object.hasOwn(playedSortOptions, params.playedSort)
        ? (params.playedSort as PlayedSort)
        : "added_desc",
    page: normalizePlayedPage(params.playedPage),
  };
}
export function playedListHref({ q, sort, page }: PlayedFilters) {
  const params = new URLSearchParams();
  if (q) params.set("playedQ", q);
  if (sort !== "added_desc") params.set("playedSort", sort);
  if (page > 1) params.set("playedPage", String(page));
  return `/dashboard${params.size ? `?${params}` : ""}#played-games`;
}
export function playedListWhere(
  userId: string,
  q: string,
): Prisma.PlayedGameWhereInput {
  // contains uses PostgreSQL LIKE: treat %, _ and backslashes as literal title characters.
  return {
    userId,
    ...(q
      ? {
          game: {
            name: {
              contains: q.replace(/[\\%_]/g, "\\$&"),
              mode: "insensitive" as const,
            },
          },
        }
      : {}),
  };
}
export function playedListOrder(
  sort: PlayedSort,
): Prisma.PlayedGameOrderByWithRelationInput[] {
  if (sort === "rating_desc" || sort === "rating_asc")
    return [
      {
        rating: {
          sort: sort === "rating_desc" ? "desc" : "asc",
          nulls: "last",
        },
      },
      { game: { name: "asc" } },
      { gameId: "asc" },
    ];
  if (sort === "name_asc" || sort === "name_desc")
    return [
      { game: { name: sort === "name_asc" ? "asc" : "desc" } },
      { gameId: "asc" },
    ];
  return [
    { addedAt: sort === "added_asc" ? "asc" : "desc" },
    { gameId: sort === "added_asc" ? "asc" : "desc" },
  ];
}
