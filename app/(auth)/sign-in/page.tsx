import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth, googleEnabled } from "@/lib/auth";
import { AuthForm } from "@/components/auth-form";
import { connection } from "next/server";
import { Suspense } from "react";
import Loading from "@/app/loading";
export const metadata: Metadata = { title: "Logowanie" };
type SignInProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
export default function SignInPage(props: SignInProps) {
  return (
    <Suspense fallback={<Loading />}>
      <SignIn {...props} />
    </Suspense>
  );
}
async function SignIn({ searchParams }: SignInProps) {
  await connection();
  if ((await auth())?.user) redirect("/dashboard");
  const params = await searchParams;
  const error =
    params.error === "OAuthAccountNotLinked"
      ? "Ten e-mail jest już przypisany do innej metody logowania. Użyj metody, którą utworzono konto."
      : params.error
        ? "Nie udało się zalogować. Spróbuj ponownie lub użyj hasła."
        : null;
  return (
    <div className="form-content">
      <div className="form-intro">
        <span className="section-label">LET’S PLAY</span>
        <h2>
          Witaj ponownie<span>.</span>
        </h2>
        <p>Twoja kolejna przygoda jest na wyciągnięcie ręki.</p>
      </div>
      {params.registered === "1" ? (
        <div className="notice success" role="status">
          Konto gotowe! Możesz się teraz zalogować.
        </div>
      ) : null}
      {params.reset === "1" ? (
        <div className="notice success" role="status">
          Hasło zostało zmienione. Zaloguj się ponownie.
        </div>
      ) : null}
      {error ? (
        <div className="notice error" role="alert">
          {error}
        </div>
      ) : null}
      <AuthForm mode="login" googleEnabled={googleEnabled} />
      <p className="form-footnote">Mały krok do wielkich przygód.</p>
    </div>
  );
}
