import "server-only";
import { prisma } from "./db";
import { lockGameCollection, saveGameSnapshot } from "./game-collection";
import type { GameDetails } from "./igdb/queries";
import { isUnreleased, UnreleasedGameError } from "./game-release";

// The caller must derive userId from the verified session.
export async function saveWishlistGame(userId: string, game: GameDetails) {
  return prisma.$transaction(async (tx) => {
    await lockGameCollection(tx, userId);
    if (
      await tx.playedGame.findUnique({
        where: { userId_gameId: { userId, gameId: game.id } },
        select: { gameId: true },
      })
    )
      return false;
    await saveGameSnapshot(tx, game);
    await tx.wishlistGame.upsert({
      where: { userId_gameId: { userId, gameId: game.id } },
      create: { userId, gameId: game.id },
      update: {},
    });
    return true;
  });
}

export async function removeWishlistGame(userId: string, gameId: number) {
  return prisma.wishlistGame.deleteMany({ where: { userId, gameId } });
}

export async function moveWishlistToPlayed(userId: string, gameId: number) {
  // Uses the saved snapshot, so moving does not require an IGDB request.
  return prisma.$transaction(async (tx) => {
    await lockGameCollection(tx, userId);
    const where = { userId_gameId: { userId, gameId } };
    const wanted = await tx.wishlistGame.findUnique({
      where,
      select: { gameId: true, game: { select: { firstReleaseDate: true } } },
    });
    if (!wanted)
      return Boolean(
        await tx.playedGame.findUnique({ where, select: { gameId: true } }),
      );
    if (isUnreleased(wanted.game.firstReleaseDate))
      throw new UnreleasedGameError();
    await tx.playedGame.upsert({
      where,
      create: { userId, gameId },
      update: {},
    });
    await tx.wishlistGame.deleteMany({ where: { userId, gameId } });
    return true;
  });
}
