"use client";
import Form from "next/form";
import { useFormStatus } from "react-dom";
import { ArrowRight, LoaderCircle, Search } from "lucide-react";

function SearchButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-label="Wyszukaj gry">
      {pending ? (
        <LoaderCircle size={18} className="animate-spin" />
      ) : (
        <ArrowRight size={19} />
      )}
    </button>
  );
}
export function SearchForm({ query = "" }: { query?: string }) {
  return (
    <Form action="/" className="catalog-search" role="search">
      <Search size={19} aria-hidden="true" />
      <label className="sr-only" htmlFor="game-search">
        Szukaj gry po tytule
      </label>
      <input
        key={query}
        id="game-search"
        name="q"
        type="search"
        placeholder="Szukaj swojej następnej gry…"
        defaultValue={query}
        maxLength={100}
        autoComplete="off"
      />
      <kbd aria-hidden="true">ENTER</kbd>
      <SearchButton />
    </Form>
  );
}
