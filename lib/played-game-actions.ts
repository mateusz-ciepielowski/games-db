"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/require-user";
import { getGameDetails } from "@/lib/igdb/catalog";
import {
  playedGameSchema,
  type PlayedGameState,
} from "@/lib/played-game-schema";
import { removePlayedGame, savePlayedGame } from "@/lib/played-games";
import { prisma } from "@/lib/db";
import {
  UnreleasedGameError,
  releaseDayLimit,
  unreleasedMessage,
  isUnreleased,
} from "./game-release";
import {
  gameRatingSchema,
  type GameRatingState,
} from "@/lib/played-game-schema";

export async function setPlayedGame(
  previous: PlayedGameState,
  formData: FormData,
): Promise<PlayedGameState> {
  const user = await requireUser();
  const parsed = playedGameSchema.safeParse({
    gameId: formData.get("gameId"),
    played: formData.get("played"),
  });
  if (!parsed.success)
    return {
      played: previous.played,
      error: true,
      message: "Nieprawidłowe dane gry. Odśwież stronę i spróbuj ponownie.",
    };
  const { gameId, played } = parsed.data;
  try {
    if (played) {
      const game = await getGameDetails(gameId);
      if (!game)
        return {
          played: previous.played,
          error: true,
          message: "Nie znaleziono tej gry w IGDB.",
        };
      await savePlayedGame(user.id, game);
    } else {
      await removePlayedGame(user.id, gameId);
    }
  } catch (error) {
    if (error instanceof UnreleasedGameError)
      return { played: previous.played, error: true, message: error.message };
    console.error("[played-games] Could not update the current user's list");
    return {
      played: previous.played,
      error: true,
      message: "Nie udało się zapisać zmiany. Spróbuj ponownie za chwilę.",
    };
  }
  revalidatePath(`/games/${gameId}`);
  revalidatePath("/dashboard");
  return {
    played,
    error: false,
    message: played
      ? "Gra dodana do Twoich ogranych."
      : "Gra usunięta z Twoich ogranych.",
  };
}

export async function setGameRating(
  previous: GameRatingState,
  formData: FormData,
): Promise<GameRatingState> {
  const user = await requireUser();
  const parsed = gameRatingSchema.safeParse({
    gameId: formData.get("gameId"),
    rating: formData.get("rating"),
  });
  if (!parsed.success)
    return {
      rating: previous.rating,
      error: true,
      message: "Wybierz całkowitą ocenę od 1 do 10.",
    };
  const { gameId, rating } = parsed.data;
  try {
    // Atomic ownership + played-state check. Never creates an entry for an unplayed game.
    const result = await prisma.playedGame.updateMany({
      where: {
        userId: user.id,
        gameId,
        game: {
          OR: [
            { firstReleaseDate: null },
            { firstReleaseDate: { lt: releaseDayLimit() } },
          ],
        },
      },
      data: { rating },
    });
    if (!result.count) {
      const entry = await prisma.playedGame.findUnique({
        where: { userId_gameId: { userId: user.id, gameId } },
        select: { game: { select: { firstReleaseDate: true } } },
      });
      return {
        rating: null,
        error: true,
        message:
          entry && isUnreleased(entry.game.firstReleaseDate)
            ? unreleasedMessage
            : "Najpierw oznacz tę grę jako ograną.",
      };
    }
  } catch {
    return {
      rating: previous.rating,
      error: true,
      message: "Nie udało się zapisać oceny. Spróbuj ponownie.",
    };
  }
  revalidatePath(`/games/${gameId}`);
  revalidatePath("/dashboard");
  return { rating, error: false, message: "Twoja ocena została zapisana." };
}
