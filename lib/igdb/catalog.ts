import "server-only";
import { cacheLife } from "next/cache";
import { requestGames } from "./client";
import {
  buildGamesQuery,
  gameSchema,
  MAX_PAGE,
  PAGE_SIZE,
  type CatalogParams,
  buildGameDetailsQuery,
  gameDetailsSchema,
} from "./queries";

export async function getGames(params: CatalogParams) {
  "use cache";
  cacheLife({ stale: 60, revalidate: 300, expire: 3600 });
  const games = gameSchema
    .array()
    .parse(await requestGames(buildGamesQuery(params)));
  return {
    games: games.slice(0, PAGE_SIZE),
    hasNext: games.length > PAGE_SIZE && params.page < MAX_PAGE,
  };
}
export async function getGameDetails(id: number) {
  "use cache";
  cacheLife("hours");
  return (
    gameDetailsSchema
      .array()
      .parse(await requestGames(buildGameDetailsQuery(id)))[0] ?? null
  );
}
