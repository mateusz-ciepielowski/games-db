"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="standalone-message">
      <h1>Przerwa w rozgrywce.</h1>
      <p>Nie udało się połączyć z usługą. Spróbuj ponownie za chwilę.</p>
      <Button onClick={reset}>Spróbuj ponownie</Button>
      <Link href="/sign-in">Wróć do logowania</Link>
    </main>
  );
}
