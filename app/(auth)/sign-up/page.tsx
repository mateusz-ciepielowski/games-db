import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth, googleEnabled } from "@/lib/auth";
import { AuthForm } from "@/components/auth-form";
import { connection } from "next/server";
export const metadata: Metadata = { title: "Utwórz konto" };
export default async function SignUp() {
  await connection();
  if ((await auth())?.user) redirect("/dashboard");
  return (
    <div className="form-content signup-content">
      <div className="form-intro">
        <span className="section-label">NOWY GRACZ, NOWA HISTORIA</span>
        <h2>
          Dołącz do gry<span>.</span>
        </h2>
        <p>Stwórz konto i rozgość się w GamesDB.</p>
      </div>
      <AuthForm mode="signup" googleEnabled={googleEnabled} />
    </div>
  );
}
