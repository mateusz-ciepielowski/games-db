import Link from "next/link";
import { ArrowLeft, ArrowRight, CircleAlert, SearchX } from "lucide-react";
import { getGames } from "@/lib/igdb/catalog";
import { IgdbError } from "@/lib/igdb/client";
import {
  catalogHref,
  PAGE_SIZE,
  sortOptions,
  type CatalogParams,
} from "@/lib/igdb/queries";
import { GameCard } from "./game-card";
import { RetryButton } from "./retry-button";

export function CatalogSkeleton() {
  return (
    <div className="catalog-skeleton" role="status" aria-label="Ładowanie gier">
      <span className="sr-only">Ładowanie gier…</span>
      {Array.from({ length: 12 }, (_, index) => (
        <div key={index} className="skeleton-card">
          <div />
          <span />
          <small />
        </div>
      ))}
    </div>
  );
}
export async function CatalogResults({ params }: { params: CatalogParams }) {
  let result;
  try {
    result = await getGames(params);
  } catch (error) {
    const code = error instanceof IgdbError ? error.code : "unavailable";
    const message =
      code === "configuration"
        ? "Katalog czeka na konfigurację połączenia z IGDB."
        : code === "authorization"
          ? "Połączenie z katalogiem wymaga odnowienia dostępu. Spróbuj ponownie później."
          : code === "rate-limit"
            ? "Katalog ma teraz dużo zapytań. Odczekaj chwilę i spróbuj ponownie."
            : "Nie udało się pobrać gier. Spróbuj ponownie za chwilę.";
    console.error(`[catalog] IGDB ${code}`);
    return (
      <div className="catalog-empty" role="alert">
        <CircleAlert size={32} />
        <h2>Mała przerwa w rozgrywce</h2>
        <p>{message}</p>
        <RetryButton />
      </div>
    );
  }
  if (!result.games.length)
    return (
      <div className="catalog-empty">
        <SearchX size={36} strokeWidth={1.3} />
        <h2>
          {params.q ? "Nie znaleźliśmy tej gry" : "Na tej stronie nie ma gier"}
        </h2>
        <p>
          {params.q
            ? `Brak wyników dla „${params.q}”. Sprawdź pisownię lub wpisz krótszy tytuł.`
            : "Wróć do początku katalogu i odkryj inne tytuły."}
        </p>
        <Link href="/" className="catalog-text-link">
          Wróć do katalogu <ArrowRight size={15} />
        </Link>
      </div>
    );
  return (
    <>
      <div className="catalog-result-summary">
        <span>
          {params.q ? (
            <>
              Wyniki dla <strong>„{params.q}”</strong>
            </>
          ) : (
            <>
              <span className="live-dot" /> {sortOptions[params.sort]}
            </>
          )}
        </span>
        <span>
          Pozycje {(params.page - 1) * PAGE_SIZE + 1}–
          {(params.page - 1) * PAGE_SIZE + result.games.length}
        </span>
      </div>
      <div className="games-grid">
        {result.games.map((game, index) => (
          <GameCard key={game.id} game={game} index={index} />
        ))}
      </div>
      <nav className="catalog-pagination" aria-label="Strony katalogu">
        {params.page > 1 ? (
          <Link
            href={catalogHref({ ...params, page: params.page - 1 })}
            prefetch={false}
          >
            <ArrowLeft size={16} /> Poprzednia
          </Link>
        ) : (
          <span className="pagination-disabled">
            <ArrowLeft size={16} /> Poprzednia
          </span>
        )}
        <span>
          Strona <strong>{params.page}</strong>
        </span>
        {result.hasNext ? (
          <Link
            href={catalogHref({ ...params, page: params.page + 1 })}
            prefetch={false}
          >
            Następna <ArrowRight size={16} />
          </Link>
        ) : (
          <span className="pagination-disabled">
            Następna <ArrowRight size={16} />
          </span>
        )}
      </nav>
    </>
  );
}
