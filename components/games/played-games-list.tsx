import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCheck, Gamepad2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import { PLAYED_PAGE_SIZE } from "@/lib/played-game-schema";
import { GameCard } from "@/components/catalog/game-card";
import { PlayedButton } from "./played-button";
import {
  normalizePlayedFilters,
  playedListHref,
  playedListOrder,
  playedListWhere,
} from "@/lib/played-game-filters";
import { PlayedFiltersForm } from "./played-filters";
import { isUnreleased } from "@/lib/game-release";

export async function PlayedGamesList({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const filters = normalizePlayedFilters(await searchParams);
  const where = playedListWhere(user.id, filters.q);
  const totalRequest = prisma.playedGame.count({ where: { userId: user.id } });
  const [total, count] = await Promise.all([
    totalRequest,
    filters.q ? prisma.playedGame.count({ where }) : totalRequest,
  ]);
  const pages = Math.max(1, Math.ceil(count / PLAYED_PAGE_SIZE));
  const page = Math.min(filters.page, pages);
  const entries = await prisma.playedGame.findMany({
    where,
    orderBy: playedListOrder(filters.sort),
    skip: (page - 1) * PLAYED_PAGE_SIZE,
    take: PLAYED_PAGE_SIZE,
    select: {
      gameId: true,
      addedAt: true,
      rating: true,
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
  return (
    <section
      className="played-games-section"
      id="played-games"
      aria-labelledby="played-games-title"
    >
      <div className="played-games-heading">
        <div>
          <span className="section-label">
            <CheckCheck size={13} /> TWOJE HISTORIE
          </span>
          <h2 id="played-games-title">
            Ograne gry <span>{total}</span>
          </h2>
          <p>Twoje ukończone przygody, zebrane w jednym miejscu.</p>
        </div>
        <Link href="/" className="catalog-text-link">
          Odkryj kolejną grę <ArrowRight size={15} />
        </Link>
      </div>
      <PlayedFiltersForm filters={filters} />
      {filters.q ? (
        <div className="played-filter-summary">
          <span>
            Znaleziono {count} z {total} gier dla „{filters.q}”.
          </span>
          <Link href={playedListHref({ ...filters, q: "", page: 1 })}>
            Wyczyść wyszukiwanie
          </Link>
        </div>
      ) : null}
      {entries.length ? (
        <>
          <div className="games-grid played-games-grid">
            {entries.map(({ game, gameId, addedAt, rating }, index) => (
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
                <PlayedButton
                  unreleased={isUnreleased(game.firstReleaseDate)}
                  compact
                  gameId={gameId}
                  initialPlayed
                  initialRating={rating}
                />
              </div>
            ))}
          </div>
          {pages > 1 ? (
            <nav
              className="catalog-pagination"
              aria-label="Strony ogranych gier"
            >
              {page > 1 ? (
                <Link
                  href={playedListHref({ ...filters, page: page - 1 })}
                  prefetch={false}
                >
                  <ArrowLeft size={14} /> Poprzednia
                </Link>
              ) : (
                <span className="pagination-disabled">Poprzednia</span>
              )}
              <span>
                Strona {page} z {pages}
              </span>
              {page < pages ? (
                <Link
                  href={playedListHref({ ...filters, page: page + 1 })}
                  prefetch={false}
                >
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
          <h3>
            {filters.q && total
              ? "Nie znaleziono pasujących gier."
              : "Każda lista zaczyna się od jednej gry."}
          </h3>
          <p>
            {filters.q && total
              ? "Sprawdź pisownię lub wpisz krótszy fragment tytułu."
              : "Otwórz kartę gry i kliknij „Ograne”. Tutaj znajdziesz wszystkie oznaczone tytuły."}
          </p>
          <Link href="/" className="catalog-text-link">
            Przeglądaj katalog <ArrowRight size={15} />
          </Link>
        </div>
      )}
    </section>
  );
}
