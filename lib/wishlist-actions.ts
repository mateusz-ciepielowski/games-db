"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "./require-user";
import { getGameDetails } from "./igdb/catalog";
import { wishlistSchema, type WishlistState } from "./wishlist-schema";
import { UnreleasedGameError } from "./game-release";
import {
  moveWishlistToPlayed,
  removeWishlistGame,
  saveWishlistGame,
} from "./wishlist-games";

export async function setWishlistGame(
  previous: WishlistState,
  formData: FormData,
): Promise<WishlistState> {
  const user = await requireUser();
  const parsed = wishlistSchema.safeParse({
    gameId: formData.get("gameId"),
    wishlistIntent: formData.get("wishlistIntent"),
  });
  if (!parsed.success)
    return {
      ...previous,
      error: true,
      message: "Nieprawidłowe dane gry. Odśwież stronę i spróbuj ponownie.",
    };
  const { gameId, wishlistIntent } = parsed.data;
  try {
    if (wishlistIntent === "add") {
      const game = await getGameDetails(gameId);
      if (!game)
        return {
          ...previous,
          error: true,
          message: "Nie znaleziono tej gry w IGDB.",
        };
      if (!(await saveWishlistGame(user.id, game)))
        return {
          wanted: false,
          error: true,
          message: "Ta gra jest już na Twojej liście ogranych.",
        };
    } else if (wishlistIntent === "remove") {
      await removeWishlistGame(user.id, gameId);
    } else if (!(await moveWishlistToPlayed(user.id, gameId))) {
      return {
        wanted: false,
        error: true,
        message:
          "Gra nie znajduje się na Twojej liście „Chcę zagrać”. Odśwież stronę.",
      };
    }
  } catch (error) {
    if (error instanceof UnreleasedGameError)
      return { ...previous, error: true, message: error.message };
    console.error("[wishlist] Could not update the current user's list");
    return {
      ...previous,
      error: true,
      message: "Nie udało się zapisać zmiany. Spróbuj ponownie za chwilę.",
    };
  }
  revalidatePath(`/games/${gameId}`);
  revalidatePath("/dashboard");
  return {
    wanted: wishlistIntent === "add",
    error: false,
    message:
      wishlistIntent === "add"
        ? "Gra dodana do listy „Chcę zagrać”."
        : wishlistIntent === "played"
          ? "Gra przeniesiona do ogranych. Możesz teraz wystawić ocenę."
          : "Gra usunięta z listy „Chcę zagrać”.",
  };
}
