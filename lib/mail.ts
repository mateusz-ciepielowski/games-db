import "server-only";
import nodemailer from "nodemailer";

export function mailEnabled() {
  return Boolean(
    process.env.SMTP_HOST && process.env.SMTP_FROM && process.env.AUTH_URL,
  );
}

export async function sendPasswordReset(email: string, token: string) {
  if (!mailEnabled()) throw new Error("SMTP is not configured");
  const url = new URL("/reset-password", process.env.AUTH_URL);
  url.searchParams.set("token", token);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    ...(process.env.SMTP_USER
      ? {
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
          },
        }
      : {}),
    connectionTimeout: 10_000,
    socketTimeout: 10_000,
  });
  await transport.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: "GamesDB — ustaw nowe hasło",
    text: `Otrzymaliśmy prośbę o zmianę hasła do GamesDB. Link jest ważny przez 30 minut i działa jeden raz.\n\n${url.toString()}\n\nJeśli to nie Ty, zignoruj tę wiadomość.`,
  });
}
