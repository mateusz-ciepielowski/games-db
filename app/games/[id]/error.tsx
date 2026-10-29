"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function GameError({ reset }: { reset: () => void }) {
  return (
    <main className="standalone-message">
      <h1>Nie udało się pobrać gry.</h1>
      <p>Katalog może być chwilowo niedostępny. Spróbuj ponownie.</p>
      <Button onClick={reset}>Spróbuj ponownie</Button>
      <Link href="/">Wróć do katalogu</Link>
    </main>
  );
}
