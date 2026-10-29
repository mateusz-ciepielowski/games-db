import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
export const metadata: Metadata = {
  title: "Nowe hasło",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default async function ResetPassword({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <div className="form-content">
      <div className="form-intro">
        <span className="section-label">NOWE HASŁO</span>
        <h2>
          Wracamy do gry<span>.</span>
        </h2>
        <p>Ustaw nowe hasło do swojego konta.</p>
      </div>
      {token ? (
        <AuthForm mode="reset" token={token} />
      ) : (
        <div className="notice error">
          Brakuje linku do zmiany hasła.{" "}
          <Link href="/forgot-password">Wyślij nowy link.</Link>
        </div>
      )}
    </div>
  );
}
