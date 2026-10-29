import "server-only";
import { prisma } from "@/lib/db";
import type { GameDetails } from "@/lib/igdb/queries";
import { lockGameCollection, saveGameSnapshot } from "./game-collection";
import { isUnreleased, UnreleasedGameError } from "./game-release";

// Callers obtain userId from the verified session, never from client input.
export async function savePlayedGame(userId: string, game: GameDetails) {
  if (
    isUnreleased(
      game.first_release_date == null
        ? null
        : new Date(game.first_release_date * 1000),
    )
  )
    throw new UnreleasedGameError();
  return prisma.$transaction(async (tx) => {
    await lockGameCollection(tx, userId);
    await saveGameSnapshot(tx, game);
    await tx.playedGame.upsert({
      where: { userId_gameId: { userId, gameId: game.id } },
      create: { userId, gameId: game.id },
      update: {},
    });
    await tx.wishlistGame.deleteMany({ where: { userId, gameId: game.id } });
  });
}
export async function removePlayedGame(userId: string, gameId: number) {
  // Removal works even when IGDB is unavailable, and only affects this user.
  return prisma.playedGame.deleteMany({ where: { userId, gameId } });
}
