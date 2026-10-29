import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Gamepad2,
  Monitor,
  Star,
  Tags,
  ArrowUpRight,
} from "lucide-react";
import { CatalogHeader } from "@/components/catalog/header";
import { getGameDetails } from "@/lib/igdb/catalog";
import { coverUrl, formatReleaseDate, screenshotUrl } from "@/lib/igdb/queries";
import { PlayedControl } from "@/components/games/played-control";
import { Copyright } from "@/components/copyright";
export const metadata: Metadata = { title: "Szczegóły gry" };
export default async function GamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^\d{1,10}$/.test(id) || Number(id) < 1 || Number(id) > 2_147_483_647)
    notFound();
  const game = await getGameDetails(Number(id));
  if (!game) notFound();
  const cover = coverUrl(game);
  return (
    <div className="catalog-shell">
      <a href="#main-content" className="skip-link">
        Przejdź do szczegółów gry
      </a>
      <CatalogHeader />
      <main className="game-detail" id="main-content">
        <Link href="/" className="back-link">
          <ArrowLeft size={16} /> Wróć do katalogu
        </Link>
        <div className="game-detail-hero">
          <aside className="game-detail-sidebar">
            <div className="game-cover">
              {cover ? (
                <Image
                  src={cover}
                  alt={`Okładka ${game.name}`}
                  fill
                  sizes="(max-width: 600px) 60vw, 264px"
                  loading="eager"
                />
              ) : (
                <span className="cover-missing">
                  <Gamepad2 size={40} />
                  Brak okładki
                </span>
              )}
            </div>
            <Suspense
              fallback={
                <p className="played-hint" role="status">
                  Sprawdzanie Twojej listy…
                </p>
              }
            >
              <PlayedControl
                gameId={game.id}
                releaseDate={game.first_release_date}
              />
            </Suspense>
            <Link
              href="/dashboard#played-games"
              className="played-profile-link"
            >
              Moja lista ogranych <ArrowUpRight size={13} />
            </Link>
            <Link
              href="/dashboard#wishlist-games"
              className="played-profile-link"
            >
              Moje gry do zagrania <ArrowUpRight size={13} />
            </Link>
          </aside>
          <div className="game-detail-heading">
            <span className="section-label">ODKRYJ GRĘ</span>
            <h1>{game.name}</h1>
            <div className="game-detail-release">
              <CalendarDays size={16} />
              <span>
                Pierwsza premiera{" "}
                <strong>{formatReleaseDate(game.first_release_date)}</strong>
              </span>
            </div>
            <div className="game-detail-facts">
              <div>
                <h2>
                  <Monitor size={15} /> Platformy
                </h2>
                <div className="game-detail-tags">
                  {game.platforms?.length ? (
                    game.platforms.map((platform) => (
                      <span key={platform.name}>{platform.name}</span>
                    ))
                  ) : (
                    <p>Brak danych o platformach.</p>
                  )}
                </div>
              </div>
              <div>
                <h2>
                  <Tags size={15} /> Gatunki
                </h2>
                <div className="game-detail-tags">
                  {game.genres?.length ? (
                    game.genres.map((genre) => (
                      <span key={genre.name}>{genre.name}</span>
                    ))
                  ) : (
                    <p>Brak danych o gatunkach.</p>
                  )}
                </div>
              </div>
            </div>
            <section
              aria-labelledby="ratings-title"
              className="game-detail-ratings"
            >
              <h2 id="ratings-title">Jak oceniana jest ta gra?</h2>
              <div className="game-score-grid">
                <Score
                  label="Gracze IGDB"
                  score={game.rating}
                  count={game.rating_count}
                />
                <Score
                  label="Krytycy"
                  score={game.aggregated_rating}
                  count={game.aggregated_rating_count}
                />
                <Score
                  label="Łączna ocena"
                  score={game.total_rating}
                  count={game.total_rating_count}
                />
              </div>
              <p className="game-score-note">
                Skala 0–10. Łączna ocena obejmuje głosy graczy i recenzentów z
                IGDB.
              </p>
            </section>
          </div>
        </div>
        <section
          className="game-description"
          aria-labelledby="description-title"
        >
          <div className="game-section-heading">
            <h2 id="description-title">O grze</h2>
            <span>OPIS Z IGDB</span>
          </div>
          <p>
            {game.summary?.trim() ||
              "IGDB nie udostępnia jeszcze opisu tej gry."}
          </p>
          <small>Opis w oryginalnym języku udostępnionym przez IGDB.</small>
        </section>
        {game.screenshots.length ? (
          <section
            className="game-screenshots"
            aria-labelledby="screenshots-title"
          >
            <div className="game-section-heading">
              <h2 id="screenshots-title">Zajrzyj do środka</h2>
              <span>{game.screenshots.length} / 3 SCREENSHOTY</span>
            </div>
            <div className="game-screenshot-grid">
              {game.screenshots.map((shot, index) => (
                <a
                  key={shot.image_id}
                  href={screenshotUrl(shot.image_id, true)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Otwórz screenshot ${index + 1} z gry ${game.name} w pełnym rozmiarze (nowa karta)`}
                >
                  <Image
                    src={screenshotUrl(shot.image_id)}
                    alt={`Screenshot ${index + 1} z gry ${game.name}`}
                    width={889}
                    height={500}
                    sizes="(max-width: 600px) 90vw, (max-width: 1000px) 44vw, 30vw"
                  />
                  <span>
                    <ArrowUpRight size={16} /> Pełny rozmiar
                  </span>
                </a>
              ))}
            </div>
          </section>
        ) : null}
      </main>
      <footer className="catalog-footer">
        <Copyright />
        <span>
          Dane, opis i obrazy:{" "}
          <a href="https://www.igdb.com/" target="_blank" rel="noreferrer">
            IGDB ↗
          </a>
        </span>
      </footer>
    </div>
  );
}

function Score({
  label,
  score,
  count,
}: {
  label: string;
  score: number | null | undefined;
  count?: number | null;
}) {
  return (
    <div className="game-score">
      <span>{label}</span>
      <div>
        <Star size={16} fill={score == null ? "none" : "currentColor"} />
        <strong>{score == null ? "—" : (score / 10).toFixed(1)}</strong>
        {score != null ? <small>/ 10</small> : null}
      </div>
      <p>
        {score == null
          ? "Brak ocen"
          : count != null
            ? `Liczba ocen: ${count.toLocaleString("pl-PL")}`
            : "Liczba ocen nieznana"}
      </p>
    </div>
  );
}
