import { Copyright } from "@/components/copyright";
import type { Metadata } from "next";
import { Suspense } from "react";
import { PlayedGamesList } from "@/components/games/played-games-list";
import { WishlistGamesList } from "@/components/games/wishlist-games-list";
import Loading from "@/app/loading";
import {
  CalendarDays,
  ChevronRight,
  Gamepad2,
  LogOut,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { requireUser } from "@/lib/require-user";
import { logout } from "@/lib/actions";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthForm } from "@/components/auth-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
export const metadata: Metadata = { title: "Twoje konto" };
type DashboardProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
export default function DashboardPage(props: DashboardProps) {
  return (
    <Suspense fallback={<Loading />}>
      <Dashboard {...props} />
    </Suspense>
  );
}
async function Dashboard({ searchParams }: DashboardProps) {
  const user = await requireUser();
  return (
    <div className="site-shell dashboard-shell">
      <a className="skip-link" href="#main-content">
        Przejdź do treści
      </a>
      <header className="site-header">
        <Brand />
        <div className="header-right">
          <ThemeToggle />
          <form action={logout}>
            <Button variant="outline">
              <LogOut size={16} /> Wyloguj się
            </Button>
          </form>
        </div>
      </header>
      <main className="dashboard-main" id="main-content">
        <div className="breadcrumb">
          GamesDB <ChevronRight size={14} /> Twoje konto
        </div>
        <section className="dashboard-welcome">
          <div>
            <span className="section-label">TWOJA PRZESTRZEŃ</span>
            <h1>
              Cześć, {user.name ?? user.username ?? "graczu"}
              <span>!</span>
            </h1>
            <p>
              Miło Cię widzieć. Tutaj zadbasz o swój profil i bezpieczeństwo
              konta.
            </p>
          </div>
          <span className="welcome-icon" aria-hidden="true">
            <Gamepad2 size={48} strokeWidth={1.3} />
          </span>
        </section>
        <div className="account-summary">
          <span className="avatar">
            {(user.name ?? "G").slice(0, 2).toUpperCase()}
          </span>
          <div>
            <strong>{user.name ?? user.username ?? "Gracz"}</strong>
            <span>{user.email}</span>
          </div>
          <div className="account-date">
            <CalendarDays size={16} /> W grze od{" "}
            {user.createdAt.toLocaleDateString("pl-PL", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </div>
          <span className="account-badge">
            <ShieldCheck size={15} /> Aktywne konto
          </span>
        </div>
        <Suspense
          fallback={
            <div className="played-games-loading" role="status">
              Ładowanie Twoich ogranych gier…
            </div>
          }
        >
          <PlayedGamesList searchParams={searchParams} />
        </Suspense>
        <Suspense
          fallback={
            <div className="played-games-loading" role="status">
              Ładowanie Twoich planowanych gier…
            </div>
          }
        >
          <WishlistGamesList searchParams={searchParams} />
        </Suspense>
        <div className="settings-grid">
          <Card>
            <CardHeader>
              <div className="card-heading-icon">
                <UserRound size={20} />
              </div>
              <CardTitle>Twój profil</CardTitle>
              <CardDescription>
                Mała zmiana, bardziej po Twojemu.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AuthForm mode="profile" defaultName={user.name ?? ""} />
              <div className="account-detail">
                <span>Nazwa gracza</span>
                <strong>{user.username ?? "Konto Google"}</strong>
              </div>
              <div className="account-detail">
                <span>Adres e-mail</span>
                <strong>{user.email}</strong>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="card-heading-icon">
                <ShieldCheck size={20} />
              </div>
              <CardTitle>Bezpieczeństwo</CardTitle>
              <CardDescription>
                {user.password
                  ? "Zmień hasło i zadbaj o swoje konto."
                  : "Logujesz się za pomocą konta Google."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {user.password ? (
                <>
                  <AuthForm mode="password" />
                  <p className="field-hint">
                    Zmiana hasła wyloguje Cię na wszystkich urządzeniach.
                  </p>
                </>
              ) : (
                <div className="notice success">
                  <ShieldCheck size={19} /> Hasłem zarządzasz w ustawieniach
                  swojego konta Google.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <footer className="site-footer">
        <Copyright />
        <span>Twoje konto. Twoja przestrzeń.</span>
      </footer>
    </div>
  );
}
