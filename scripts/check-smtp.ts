import { loadEnvConfig } from "@next/env";
import nodemailer from "nodemailer";
loadEnvConfig(process.cwd());
async function main() {
  if (
    !["SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM", "AUTH_URL"].every(
      (key) => process.env[key],
    )
  ) {
    console.error(
      "Uzupełnij SMTP_HOST, SMTP_USER, SMTP_PASSWORD, SMTP_FROM i AUTH_URL w .env.",
    );
    process.exitCode = 1;
    return;
  }
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASSWORD! },
    connectionTimeout: 10_000,
    socketTimeout: 10_000,
  });
  try {
    await transport.verify();
    console.log(
      "SMTP: połączenie i logowanie poprawne. Nie wysłano żadnej wiadomości. Dostarczenie sprawdzisz formularzem resetu.",
    );
  } catch (error) {
    const code = (error as { code?: string }).code;
    console.error(
      code === "EAUTH"
        ? "SMTP: logowanie odrzucone. Sprawdź pełny adres Gmail i hasło do aplikacji."
        : "SMTP: połączenie nie powiodło się. Sprawdź host, port, TLS i dostęp do sieci.",
    );
    process.exitCode = 1;
  } finally {
    transport.close();
  }
}
void main();
