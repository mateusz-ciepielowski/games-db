import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { ArrowUpRight, UserRound } from "lucide-react";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { auth } from "@/lib/auth";
import { SearchForm } from "./search-form";

async function AccountLink() {
  await connection();
  const session = await auth();
  return (
    <Link
      className="catalog-account"
      href={session?.user ? "/dashboard" : "/sign-in"}
    >
      <UserRound size={17} />
      <span>{session?.user ? "Moje konto" : "Zaloguj się"}</span>
      <ArrowUpRight size={14} />
    </Link>
  );
}
export function CatalogHeader({ query }: { query?: string }) {
  return (
    <header className="catalog-header">
      <Brand />
      <SearchForm query={query} />
      <div className="catalog-header-actions">
        <ThemeToggle />
        <Suspense
          fallback={
            <Link className="catalog-account" href="/dashboard">
              <UserRound size={17} />
              <span>Konto</span>
            </Link>
          }
        >
          <AccountLink />
        </Suspense>
      </div>
    </header>
  );
}
