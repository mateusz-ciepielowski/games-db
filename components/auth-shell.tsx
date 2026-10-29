import { Copyright } from "@/components/copyright";
import {
  ArrowUpRight,
  Bookmark,
  Gamepad2,
  Layers3,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">
        Przejdź do treści
      </a>
      <header className="site-header">
        <Brand />
        <div className="header-right">
          <span className="header-note">
            Twój kolejny rozdział zaczyna się tutaj
          </span>
          <ThemeToggle />
        </div>
      </header>
      <main className="auth-layout" id="main-content">
        <section className="story-panel" aria-label="Witaj w GamesDB">
          <div className="story-top">
            <span className="eyebrow">
              <span className="live-dot" /> TWOJE MIEJSCE W ŚWIECIE GIER
            </span>
            <ArrowUpRight size={21} />
          </div>
          <div className="story-copy">
            <p className="small-caption">DOBRZE CIĘ WIDZIEĆ, GRACZU</p>
            <h1>
              Każda gra to
              <br />
              nowa <span>historia.</span>
            </h1>
            <p>
              Zrób miejsce na kolejną przygodę.
              <br />
              Zacznij od swojego konta w GamesDB.
            </p>
          </div>
          <div className="game-art" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="art-card art-card-back">
              <Layers3 size={27} />
              <span>PLAY. EXPLORE. REPEAT.</span>
            </div>
            <div className="art-card art-card-front">
              <div className="art-card-top">
                <span>GAMESDB ORIGINAL</span>
                <Sparkles size={15} />
              </div>
              <div className="landscape">
                <div className="art-sun" />
                <div className="mountain mountain-back" />
                <div className="mountain mountain-front" />
                <div className="art-path" />
              </div>
              <div className="art-card-bottom">
                <div>
                  <small>THE NEXT CHAPTER</small>
                  <strong>Twoja przygoda</strong>
                </div>
                <span className="art-play">
                  <Gamepad2 size={23} />
                </span>
              </div>
            </div>
            <div className="floating-label">
              <span>
                <Bookmark size={16} />
              </span>{" "}
              Zapisz się na nowy rozdział
            </div>
            <span className="art-plus plus-one">+</span>
            <span className="art-plus plus-two">+</span>
          </div>
          <div className="story-bottom">
            <span>
              <ShieldCheck size={16} /> Twoje konto. Twoja przestrzeń.
            </span>
            <span>01 — ∞</span>
          </div>
        </section>
        <section className="form-panel">{children}</section>
      </main>
      <footer className="site-footer">
        <Copyright />
        <span>
          Stworzone z pasji do grania <Gamepad2 size={14} />
        </span>
        <span className="footer-status">
          <span className="live-dot" /> Gotowy na nową grę?
        </span>
      </footer>
    </div>
  );
}
