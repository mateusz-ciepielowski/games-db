import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AuthForm } from "@/components/auth-form";
export const metadata: Metadata = { title: "Odzyskaj dostęp" };
export default function ForgotPassword() {
  return (
    <div className="form-content">
      <Link href="/sign-in" className="back-link">
        <ArrowLeft size={16} /> Wróć do logowania
      </Link>
      <div className="form-intro">
        <span className="section-label">WRÓĆ DO GRY</span>
        <h2>
          Nowy start<span>.</span>
        </h2>
        <p>
          Podaj adres e-mail. Wyślemy Ci link do ustawienia nowego hasła, ważny
          przez 30 minut.
        </p>
      </div>
      <AuthForm mode="forgot" />
    </div>
  );
}
