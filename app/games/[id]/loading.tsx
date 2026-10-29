import { CatalogHeader } from "@/components/catalog/header";
export default function LoadingGame() {
  return (
    <div className="catalog-shell">
      <CatalogHeader />
      <main
        className="game-preview"
        role="status"
        aria-label="Ładowanie karty gry"
      >
        <div className="game-preview-grid">
          <div className="skeleton-card">
            <div />
          </div>
          <div>
            <span className="section-label">KARTA GRY</span>
            <p>Ładowanie gry…</p>
          </div>
        </div>
      </main>
    </div>
  );
}
