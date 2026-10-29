import { z } from "zod";

const username = z
  .string({ error: "Podaj nazwę gracza." })
  .trim()
  .toLowerCase()
  .min(3, "Nazwa musi mieć co najmniej 3 znaki.")
  .max(24, "Maksymalnie 24 znaki.")
  .regex(/^[a-z0-9_]+$/, "Użyj liter, cyfr i podkreślenia.");
const email = z
  .string({ error: "Podaj adres e-mail." })
  .trim()
  .toLowerCase()
  .max(254)
  .pipe(z.email("Podaj poprawny adres e-mail."));
// bcrypt processes at most 72 UTF-8 bytes. Passwords must never be trimmed.
export const password = z
  .string({ error: "Podaj hasło." })
  .min(8, "Hasło musi mieć co najmniej 8 znaków.")
  .max(72, "Hasło jest za długie.")
  .refine(
    (value) => new TextEncoder().encode(value).length <= 72,
    "Hasło może mieć maksymalnie 72 bajty UTF-8.",
  );
const confirmPassword = z.string({ error: "Powtórz hasło." });
export const loginSchema = z.object({
  identifier: z
    .string({ error: "Podaj e-mail lub nazwę gracza." })
    .trim()
    .toLowerCase()
    .min(3, "Podaj e-mail lub nazwę gracza.")
    .max(254),
  password,
});
export const signUpSchema = z
  .object({ username, email, password, confirmPassword })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Hasła muszą być takie same.",
  });
export const forgotPasswordSchema = z.object({ email });
export const resetPasswordSchema = z
  .object({
    token: z.string().uuid("Link jest nieprawidłowy."),
    password,
    confirmPassword,
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Hasła muszą być takie same.",
  });
export const changePasswordSchema = z
  .object({ currentPassword: password, password, confirmPassword })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Hasła muszą być takie same.",
  })
  .refine((data) => data.currentPassword !== data.password, {
    path: ["password"],
    message: "Nowe hasło musi różnić się od obecnego.",
  });
export const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Minimum 2 znaki.")
    .max(50, "Maksymalnie 50 znaków."),
});
