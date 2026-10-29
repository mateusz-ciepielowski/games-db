import { z } from "zod";
export const wishlistSchema = z.object({
  gameId: z.coerce.number().int().min(1).max(2_147_483_647),
  wishlistIntent: z.enum(["add", "remove", "played"]),
});
export type WishlistState = {
  wanted: boolean;
  error: boolean;
  message: string | null;
};
