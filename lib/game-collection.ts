import "server-only";
import type { Prisma } from "@prisma/client";
import type { GameDetails } from "@/lib/igdb/queries";

// All transitions between the two lists take this lock first. This serializes
// concurrent requests for one user so the game cannot end up on both lists.
export async function lockGameCollection(
  tx: Prisma.TransactionClient,
  userId: string,
) {
  await tx.$queryRaw`SELECT "id" FROM "games_db"."User" WHERE "id" = ${userId} FOR UPDATE`;
}

export async function saveGameSnapshot(
  tx: Prisma.TransactionClient,
  game: GameDetails,
) {
  const snapshot = {
    name: game.name,
    coverImageId: game.cover?.image_id ?? null,
    firstReleaseDate:
      game.first_release_date == null
        ? null
        : new Date(game.first_release_date * 1000),
  };
  await tx.game.upsert({
    where: { id: game.id },
    create: { id: game.id, ...snapshot },
    update: snapshot,
  });
}
