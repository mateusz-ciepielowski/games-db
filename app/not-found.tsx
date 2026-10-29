import Link from "next/link";
export default function NotFound() {
  return (
    <main className="standalone-message">
      <span className="section-label">404 — POZA MAPĄ</span>
      <h1>Ten poziom nie istnieje.</h1>
      <p>Wróć do GamesDB i wybierz inną drogę.</p>
      <Link href="/">Wróć do katalogu →</Link>
    </main>
  );
}
