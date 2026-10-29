import Link from "next/link";
import { ArrowLeft, ArrowRight, Bookmark, Gamepad2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import {
  PLAYED_PAGE_SIZE,
  normalizePlayedPage,
} from "@/lib/played-game-schema";
import {
  normalizePlayedFilters,
  playedListHref,
} from "@/lib/played-game-filters";
import { GameCard } from "@/components/catalog/game-card";
import { WishlistButton } from "./wishlist-button";
import { isUnreleased } from "@/lib/game-release";

export async function WishlistGamesList({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const count = await prisma.wishlistGame.count({ where: { userId: user.id } });
  const pages = Math.max(1, Math.ceil(count / PLAYED_PAGE_SIZE));
  const page = Math.min(normalizePlayedPage(params.wantedPage), pages);
  const entries = await prisma.wishlistGame.findMany({
    where: { userId: user.id },
    orderBy: [{ addedAt: "desc" }, { gameId: "desc" }],
    skip: (page - 1) * PLAYED_PAGE_SIZE,
    take: PLAYED_PAGE_SIZE,
    select: {
      gameId: true,
      addedAt: true,
      game: {
        select: {
          id: true,
          name: true,
          coverImageId: true,
          firstReleaseDate: true,
        },
      },
    },
  });
  function pageHref(target: number) {
    const base = playedListHref(normalizePlayedFilters(params)).split("#")[0];
    const [path, query] = base.split("?");
    const search = new URLSearchParams(query);
    if (target > 1) search.set("wantedPage", String(target));
    return `${path}${search.size ? `?${search}` : ""}#wishlist-games`;
  }
  return (
    <section
      className="played-games-section wishlist-games-section"
      id="wishlist-games"
      aria-labelledby="wishlist-games-title"
    >
      <div className="played-games-heading">
        <div>
          <span className="section-label">
            <Bookmark size={13} /> KOLEJNE PRZYGODY
          </span>
          <h2 id="wishlist-games-title">
            Chcę zagrać <span>{count}</span>
          </h2>
          <p>Gry na później. Gdy skończysz, przenieś je do ogranych.</p>
        </div>
        <Link href="/" className="catalog-text-link">
          Znajdź kolejną grę <ArrowRight size={15} />
        </Link>
      </div>
      {entries.length ? (
        <>
          <div className="games-grid played-games-grid">
            {entries.map(({ game, gameId, addedAt }, index) => (
              <div key={gameId} className="played-list-item">
                <GameCard
                  game={{
                    id: game.id,
                    name: game.name,
                    cover: game.coverImageId
                      ? { image_id: game.coverImageId }
                      : null,
                    first_release_date: game.firstReleaseDate
                      ? game.firstReleaseDate.getTime() / 1000
                      : null,
                  }}
                  index={index}
                />
                <p className="played-added-date">
                  Dodano{" "}
                  {addedAt.toLocaleDateString("pl-PL", { timeZone: "UTC" })}
                </p>
                <WishlistButton
                  gameId={gameId}
                  initialWanted
                  compact
                  unreleased={isUnreleased(game.firstReleaseDate)}
                />
              </div>
            ))}
          </div>
          {pages > 1 ? (
            <nav
              className="catalog-pagination"
              aria-label="Strony gier Chcę zagrać"
            >
              {page > 1 ? (
                <Link href={pageHref(page - 1)} prefetch={false}>
                  <ArrowLeft size={14} /> Poprzednia
                </Link>
              ) : (
                <span className="pagination-disabled">Poprzednia</span>
              )}
              <span>
                Strona {page} z {pages}
              </span>
              {page < pages ? (
                <Link href={pageHref(page + 1)} prefetch={false}>
                  Następna <ArrowRight size={14} />
                </Link>
              ) : (
                <span className="pagination-disabled">Następna</span>
              )}
            </nav>
          ) : null}
        </>
      ) : (
        <div className="played-games-empty">
          <Gamepad2 size={35} strokeWidth={1.3} />
          <h3>Twoja następna przygoda czeka.</h3>
          <p>Na stronie gry kliknij „Chcę zagrać”, a pojawi się tutaj.</p>
          <Link href="/" className="catalog-text-link">
            Przeglądaj katalog <ArrowRight size={15} />
          </Link>
        </div>
      )}
    </section>
  );
}
