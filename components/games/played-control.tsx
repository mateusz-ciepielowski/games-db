import Link from "next/link";
import { connection } from "next/server";
import { UserRound } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PlayedButton } from "./played-button";
import { WishlistButton } from "./wishlist-button";
import { isUnreleased } from "@/lib/game-release";

export async function PlayedControl({
  gameId,
  releaseDate,
}: {
  gameId: number;
  releaseDate?: number | null;
}) {
  await connection();
  const session = await auth();
  const unreleased = isUnreleased(
    releaseDate == null ? null : new Date(releaseDate * 1000),
  );
  if (!session?.user?.id)
    return (
      <div className="played-sign-in">
        <Link href="/sign-in">
          <UserRound size={16} /> Zaloguj się, aby oznaczyć jako ograne
        </Link>
        <p>Twoja lista będzie czekać na profilu.</p>
        <p>Zaloguj się również, aby zapisać gry na liście „Chcę zagrać”.</p>
      </div>
    );
  let played;
  let wanted;
  try {
    [played, wanted] = await Promise.all([
      prisma.playedGame.findUnique({
        where: { userId_gameId: { userId: session.user.id, gameId } },
        select: { gameId: true, rating: true },
      }),
      prisma.wishlistGame.findUnique({
        where: { userId_gameId: { userId: session.user.id, gameId } },
        select: { gameId: true },
      }),
    ]);
  } catch {
    return (
      <p className="played-feedback is-error" role="alert">
        Twoje listy są chwilowo niedostępne. Odśwież stronę, aby spróbować
        ponownie.
      </p>
    );
  }
  return (
    <div className="game-list-controls">
      <PlayedButton
        unreleased={unreleased}
        key={`played:${Boolean(played)}:${played?.rating ?? "none"}`}
        gameId={gameId}
        initialPlayed={Boolean(played)}
        initialRating={played?.rating ?? null}
      />
      {!played ? (
        <WishlistButton
          key={`wanted:${Boolean(wanted)}`}
          gameId={gameId}
          initialWanted={Boolean(wanted)}
        />
      ) : null}
    </div>
  );
}
