"use client";
import Form from "next/form";
import { useFormStatus } from "react-dom";
import { LoaderCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  playedSortOptions,
  type PlayedFilters,
} from "@/lib/played-game-filters";

function ApplyFilters() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? (
        <LoaderCircle size={15} className="animate-spin" />
      ) : (
        <Search size={15} />
      )}
      {pending ? "Szukam…" : "Zastosuj"}
    </Button>
  );
}
export function PlayedFiltersForm({ filters }: { filters: PlayedFilters }) {
  return (
    <Form
      action="/dashboard#played-games"
      className="played-filters"
      role="search"
      aria-label="Wyszukaj ograne gry"
    >
      <div className="played-filter-search">
        <label htmlFor="played-search">Tytuł gry</label>
        <input
          key={filters.q}
          id="played-search"
          name="playedQ"
          type="search"
          maxLength={100}
          placeholder="Szukaj w ogranych grach…"
          defaultValue={filters.q}
        />
      </div>
      <div className="played-filter-sort">
        <label htmlFor="played-sort">Sortowanie</label>
        <select
          key={filters.sort}
          id="played-sort"
          name="playedSort"
          defaultValue={filters.sort}
        >
          {Object.entries(playedSortOptions).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <ApplyFilters />
    </Form>
  );
}
