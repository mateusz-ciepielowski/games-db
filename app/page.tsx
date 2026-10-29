import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowDown, Compass, Gamepad2, X } from "lucide-react";
import { CatalogHeader } from "@/components/catalog/header";
import { CatalogResults, CatalogSkeleton } from "@/components/catalog/results";
import { Copyright } from "@/components/copyright";
import {
  catalogHref,
  normalizeCatalogParams,
  sortOptions,
} from "@/lib/igdb/queries";
export const metadata: Metadata = { title: "Odkrywaj gry" };
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = normalizeCatalogParams(await searchParams);
  return (
    <div className="catalog-shell">
      <a href="#games" className="skip-link">
        Przejdź do gier
      </a>
      <CatalogHeader query={params.q} />
      <main id="main-content">
        <section className="catalog-intro">
          <div>
            <span className="section-label">
              <Compass size={13} /> ZNAJDŹ SWÓJ NASTĘPNY ŚWIAT
            </span>
            <h1>
              Tyle gier.
              <br />
              Tyle <span>możliwości.</span>
            </h1>
            <p>
              Wielkie światy, małe perełki i historie, które zostają.
              <br className="desktop-break" /> Odkryj grę, od której trudno się
              oderwać.
            </p>
          </div>
          <div className="catalog-intro-note">
            <span className="intro-gamepad">
              <Gamepad2 size={49} strokeWidth={1.3} />
            </span>
            <p>
              Kolejna przygoda
              <br />
              jest bliżej, niż myślisz.
            </p>
            <a href="#games" aria-label="Przejdź do katalogu gier">
              <ArrowDown size={18} />
            </a>
          </div>
        </section>
        <section
          className="catalog-section"
          id="games"
          aria-labelledby="catalog-title"
        >
          <div className="catalog-toolbar">
            <div className="catalog-section-title">
              <h2 id="catalog-title">
                {params.q ? "Wyniki wyszukiwania" : "Odkrywaj gry"}
              </h2>
              <span className="catalog-label">KATALOG</span>
            </div>
            {params.q ? (
              <Link href="/" className="clear-search">
                <X size={14} /> Wyczyść wyszukiwanie
              </Link>
            ) : (
              <nav className="catalog-sort" aria-label="Kolejność gier">
                {Object.entries(sortOptions).map(([value, label]) => (
                  <Link
                    key={value}
                    href={catalogHref({ sort: value as typeof params.sort })}
                    aria-current={params.sort === value ? "page" : undefined}
                    prefetch={false}
                  >
                    {label}
                  </Link>
                ))}
              </nav>
            )}
          </div>
          <Suspense
            key={`${params.q}:${params.page}:${params.sort}`}
            fallback={<CatalogSkeleton />}
          >
            <CatalogResults params={params} />
          </Suspense>
        </section>
      </main>
      <footer className="catalog-footer">
        <Copyright />
        <span>
          Dane i okładki:{" "}
          <a href="https://www.igdb.com/" target="_blank" rel="noreferrer">
            IGDB <span aria-hidden="true">↗</span>
          </a>
        </span>
        <span>
          Stworzone z pasji do grania <Gamepad2 size={14} />
        </span>
      </footer>
    </div>
  );
}
