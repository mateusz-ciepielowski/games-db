import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Gamepad2, Star } from "lucide-react";
import { coverUrl, releaseYear, type Game } from "@/lib/igdb/queries";

export function GameCard({ game, index }: { game: Game; index: number }) {
  const cover = coverUrl(game);
  const year = releaseYear(game);
  return (
    <article className="game-card">
      <Link
        href={`/games/${game.id}`}
        prefetch={false}
        className="game-card-link"
        aria-label={`Zobacz grę: ${game.name}`}
      >
        <div className="game-cover">
          {cover ? (
            <Image
              src={cover}
              alt={`Okładka ${game.name}`}
              fill
              sizes="(max-width: 480px) 45vw, (max-width: 760px) 30vw, (max-width: 1100px) 23vw, 15vw"
              loading={index < 6 ? "eager" : "lazy"}
            />
          ) : (
            <span className="cover-missing">
              <Gamepad2 size={36} strokeWidth={1.2} />
              <span>Brak okładki</span>
            </span>
          )}
          {game.total_rating != null ? (
            <span className="game-rating">
              <Star size={11} fill="currentColor" />
              {(game.total_rating / 10).toFixed(1)}
            </span>
          ) : null}
          <span className="game-cover-arrow">
            <ArrowUpRight size={19} />
          </span>
        </div>
        <div className="game-card-title">
          <h3>{game.name}</h3>
        </div>
        <p className="game-card-meta">
          {year ?? "Data nieznana"}
          <span>·</span>
          {game.genres?.[0]?.name ?? "Gra wideo"}
        </p>
      </Link>
    </article>
  );
}
