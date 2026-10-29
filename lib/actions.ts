"use server";

import { createHash } from "node:crypto";
import { v4 as uuid } from "uuid";
import bcrypt from "bcrypt";
import { AuthError } from "next-auth";
import { Prisma } from "@prisma/client";
import { parseWithZod } from "@conform-to/zod/v4";
import type { SubmissionResult } from "@conform-to/react";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { googleEnabled, signIn, signOut } from "@/lib/auth";
import { requireUser } from "@/lib/require-user";
import { rateLimit } from "@/lib/rate-limit";
import { mailEnabled, sendPasswordReset } from "@/lib/mail";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  profileSchema,
  resetPasswordSchema,
  signUpSchema,
} from "@/lib/zodSchemas";

type State = SubmissionResult<string[]> | undefined;
const hideFields = ["password", "confirmPassword", "currentPassword", "token"];
const unavailable =
  "Nie udało się połączyć z usługą. Spróbuj ponownie za chwilę.";
const tooMany = "Zbyt wiele prób. Spróbuj ponownie za 15 minut.";
const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export async function credentialsSignUp(
  _: State,
  formData: FormData,
): Promise<State> {
  const submission = parseWithZod(formData, { schema: signUpSchema });
  if (submission.status !== "success") return submission.reply({ hideFields });
  const { username, email, password } = submission.value;
  try {
    if (!(await rateLimit("signup", email, 5)))
      return submission.reply({ hideFields, formErrors: [tooMany] });
    await prisma.user.create({
      data: {
        username,
        name: username,
        email,
        password: await bcrypt.hash(password, 12),
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return submission.reply({
        hideFields,
        formErrors: [
          "Ta nazwa gracza lub adres e-mail są już zajęte. Zaloguj się lub wybierz inne dane.",
        ],
      });
    }
    console.error("[signup] Database operation failed");
    return submission.reply({ hideFields, formErrors: [unavailable] });
  }
  redirect("/sign-in?registered=1");
}

export async function credentialsSignIn(
  _: State,
  formData: FormData,
): Promise<State> {
  const submission = parseWithZod(formData, { schema: loginSchema });
  if (submission.status !== "success") return submission.reply({ hideFields });
  try {
    await signIn("credentials", {
      ...submission.value,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return submission.reply({
        hideFields,
        formErrors: [
          error.type === "CredentialsSignin"
            ? "Nieprawidłowy login lub hasło albo przekroczony limit prób."
            : unavailable,
        ],
      });
    }
    // Successful signIn throws NEXT_REDIRECT; let Next.js handle it.
    throw error;
  }
}

export async function googleSignIn() {
  if (!googleEnabled) redirect("/sign-in?error=Configuration");
  await signIn("google", { redirectTo: "/dashboard" });
}

export async function logout() {
  await signOut({ redirectTo: "/sign-in" });
}

export async function forgotPassword(
  _: State,
  formData: FormData,
): Promise<State> {
  const submission = parseWithZod(formData, { schema: forgotPasswordSchema });
  if (submission.status !== "success") return submission.reply({ hideFields });
  if (!mailEnabled())
    return submission.reply({
      formErrors: [
        "Odzyskiwanie hasła będzie dostępne po skonfigurowaniu poczty przez administratora.",
      ],
    });
  try {
    if (!(await rateLimit("reset", submission.value.email, 3)))
      return submission.reply({ formErrors: [tooMany] });
    const user = await prisma.user.findUnique({
      where: { email: submission.value.email },
    });
    if (user?.password && user.email) {
      const token = uuid();
      const identifier = `reset:${user.id}`;
      const hashedToken = tokenHash(token);
      await prisma.$transaction([
        prisma.verificationToken.deleteMany({ where: { identifier } }),
        prisma.verificationToken.create({
          data: {
            identifier,
            token: hashedToken,
            expires: new Date(Date.now() + 30 * 60_000),
          },
        }),
      ]);
      try {
        await sendPasswordReset(user.email, token);
      } catch {
        // Same response for existing and unknown accounts, including SMTP failures.
        await prisma.verificationToken.deleteMany({
          where: { token: hashedToken },
        });
        console.error("[password-reset] Delivery failed; check SMTP settings");
      }
    }
    return submission.reply({ resetForm: true });
  } catch {
    console.error("[password-reset] Database operation failed");
    return submission.reply({ formErrors: [unavailable] });
  }
}

export async function resetPassword(
  _: State,
  formData: FormData,
): Promise<State> {
  const submission = parseWithZod(formData, { schema: resetPasswordSchema });
  if (submission.status !== "success") return submission.reply({ hideFields });
  const { token, password } = submission.value;
  try {
    if (!(await rateLimit("reset-token", token, 5)))
      return submission.reply({ hideFields, formErrors: [tooMany] });
    const hash = await bcrypt.hash(password, 12);
    const updated = await prisma.$transaction(async (tx) => {
      // DELETE RETURNING consumes the token atomically; parallel reuse cannot succeed.
      const rows = await tx.$queryRaw<{ identifier: string }[]>`
        DELETE FROM "VerificationToken" WHERE "token" = ${tokenHash(token)}
        AND "expires" > NOW() AND "identifier" LIKE 'reset:%' RETURNING "identifier"`;
      if (!rows[0]) return false;
      await tx.user.update({
        where: { id: rows[0].identifier.slice(6) },
        data: { password: hash, sessionVersion: { increment: 1 } },
      });
      return true;
    });
    if (!updated)
      return submission.reply({
        hideFields,
        formErrors: ["Link wygasł lub został już użyty. Poproś o nowy link."],
      });
  } catch {
    return submission.reply({ hideFields, formErrors: [unavailable] });
  }
  redirect("/sign-in?reset=1");
}

export async function changePassword(
  _: State,
  formData: FormData,
): Promise<State> {
  const user = await requireUser();
  const submission = parseWithZod(formData, { schema: changePasswordSchema });
  if (submission.status !== "success") return submission.reply({ hideFields });
  try {
    if (!(await rateLimit("change-password", user.id, 5)))
      return submission.reply({ hideFields, formErrors: [tooMany] });
    if (
      !user.password ||
      !(await bcrypt.compare(submission.value.currentPassword, user.password))
    ) {
      return submission.reply({
        hideFields,
        fieldErrors: { currentPassword: ["Obecne hasło jest nieprawidłowe."] },
      });
    }
    const hash = await bcrypt.hash(submission.value.password, 12);
    // Compare-and-set prevents concurrent password reset/change from being overwritten.
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.updateMany({
        where: { id: user.id, password: user.password },
        data: { password: hash, sessionVersion: { increment: 1 } },
      });
      if (updated.count)
        await tx.verificationToken.deleteMany({
          where: { identifier: `reset:${user.id}` },
        });
      return updated;
    });
    if (!result.count)
      return submission.reply({
        hideFields,
        formErrors: ["Hasło zostało już zmienione. Zaloguj się ponownie."],
      });
  } catch {
    return submission.reply({ hideFields, formErrors: [unavailable] });
  }
  await signOut({ redirectTo: "/sign-in?reset=1" });
}

export async function updateProfile(
  _: State,
  formData: FormData,
): Promise<State> {
  const user = await requireUser();
  const submission = parseWithZod(formData, { schema: profileSchema });
  if (submission.status !== "success") return submission.reply();
  try {
    await prisma.user.update({
      where: { id: user.id },
      data: submission.value,
    });
  } catch {
    return submission.reply({ formErrors: [unavailable] });
  }
  revalidatePath("/dashboard");
  return submission.reply();
}
