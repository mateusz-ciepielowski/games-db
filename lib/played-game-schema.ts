import { z } from "zod";

export const playedGameSchema = z.object({
  gameId: z.coerce.number().int().min(1).max(2_147_483_647),
  played: z.enum(["true", "false"]).transform((value) => value === "true"),
});
export type PlayedGameState = {
  played: boolean;
  message: string | null;
  error: boolean;
};
export const gameRatingSchema = z.object({
  gameId: z.coerce.number().int().min(1).max(2_147_483_647),
  rating: z
    .string()
    .regex(/^(?:[1-9]|10)$/, "Wybierz całkowitą ocenę od 1 do 10.")
    .transform(Number),
});
export type GameRatingState = {
  rating: number | null;
  message: string | null;
  error: boolean;
};
export const PLAYED_PAGE_SIZE = 12;
export function normalizePlayedPage(page: string | string[] | undefined) {
  return typeof page === "string" && /^[1-9]\d{0,5}$/.test(page)
    ? Number(page)
    : 1;
}
