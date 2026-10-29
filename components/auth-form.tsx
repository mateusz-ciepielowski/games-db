"use client";
import { useActionState, useId, useState } from "react";
import {
  getFormProps,
  getInputProps,
  useForm,
  type FieldMetadata,
} from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod/v4";
import { z } from "zod";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  credentialsSignIn,
  credentialsSignUp,
  forgotPassword,
  googleSignIn,
  resetPassword,
  changePassword,
  updateProfile,
} from "@/lib/actions";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  profileSchema,
  resetPasswordSchema,
  signUpSchema,
} from "@/lib/zodSchemas";

const modes = {
  login: {
    action: credentialsSignIn,
    schema: loginSchema,
    submit: "Zaloguj się",
    fields: ["identifier", "password"],
  },
  signup: {
    action: credentialsSignUp,
    schema: signUpSchema,
    submit: "Utwórz konto",
    fields: ["username", "email", "password", "confirmPassword"],
  },
  forgot: {
    action: forgotPassword,
    schema: forgotPasswordSchema,
    submit: "Wyślij link do zmiany hasła",
    fields: ["email"],
  },
  reset: {
    action: resetPassword,
    schema: resetPasswordSchema,
    submit: "Zapisz nowe hasło",
    fields: ["password", "confirmPassword"],
  },
  password: {
    action: changePassword,
    schema: changePasswordSchema,
    submit: "Zmień hasło",
    fields: ["currentPassword", "password", "confirmPassword"],
  },
  profile: {
    action: updateProfile,
    schema: profileSchema,
    submit: "Zapisz zmiany",
    fields: ["name"],
  },
} as const;
type Mode = keyof typeof modes;
const labels: Record<
  string,
  { label: string; placeholder: string; autocomplete: string }
> = {
  identifier: {
    label: "E-mail lub nazwa gracza",
    placeholder: "np. gracz@example.com",
    autocomplete: "username",
  },
  username: {
    label: "Nazwa gracza",
    placeholder: "np. player_one",
    autocomplete: "username",
  },
  name: {
    label: "Wyświetlana nazwa",
    placeholder: "Jak mamy się do Ciebie zwracać?",
    autocomplete: "nickname",
  },
  email: {
    label: "Adres e-mail",
    placeholder: "ty@example.com",
    autocomplete: "email",
  },
  password: {
    label: "Hasło",
    placeholder: "Wpisz swoje hasło",
    autocomplete: "new-password",
  },
  confirmPassword: {
    label: "Powtórz hasło",
    placeholder: "Wpisz hasło jeszcze raz",
    autocomplete: "new-password",
  },
  currentPassword: {
    label: "Obecne hasło",
    placeholder: "Wpisz obecne hasło",
    autocomplete: "current-password",
  },
};
function FormField({
  field,
  name,
  mode,
}: {
  field: FieldMetadata<string>;
  name: string;
  mode: Mode;
}) {
  const [visible, setVisible] = useState(false);
  const config = labels[name];
  const isPassword = name.toLowerCase().includes("password");
  const { key, ...inputProps } = getInputProps(field, {
    type: isPassword ? "password" : name === "email" ? "email" : "text",
  });
  const Icon = isPassword
    ? LockKeyhole
    : name === "email" || name === "identifier"
      ? Mail
      : UserRound;
  return (
    <div className="field-group">
      <div className="field-label-row">
        <Label htmlFor={field.id}>{config.label}</Label>
        {name === "password" && mode === "login" ? (
          <Link href="/forgot-password" className="subtle-link">
            Nie pamiętasz hasła?
          </Link>
        ) : null}
      </div>
      <div className="input-wrap">
        <Icon className="input-icon" size={17} />
        <Input
          key={key}
          {...inputProps}
          type={isPassword && visible ? "text" : inputProps.type}
          autoComplete={
            name === "password" && mode === "login"
              ? "current-password"
              : config.autocomplete
          }
          placeholder={config.placeholder}
          required
          className={isPassword ? "has-toggle" : ""}
        />
        {isPassword ? (
          <button
            type="button"
            className="password-toggle"
            aria-label={
              visible ? `Ukryj: ${config.label}` : `Pokaż: ${config.label}`
            }
            aria-pressed={visible}
            onClick={() => setVisible((value) => !value)}
          >
            {visible ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        ) : null}
      </div>
      {name === "password" && mode !== "login" ? (
        <p className="field-hint">
          Minimum 8 znaków. Maksymalnie 72 bajty UTF-8.
        </p>
      ) : null}
      <div id={field.errorId} className="field-error" aria-live="polite">
        {field.errors}
      </div>
    </div>
  );
}
export function AuthForm({
  mode,
  googleEnabled = false,
  token,
  defaultName,
}: {
  mode: Mode;
  googleEnabled?: boolean;
  token?: string;
  defaultName?: string;
}) {
  const config = modes[mode];
  const [lastResult, action, pending] = useActionState(
    config.action,
    undefined,
  );
  const id = useId();
  const [form, fields] = useForm<Record<string, string>>({
    id,
    lastResult,
    defaultValue: { token: token ?? "", name: defaultName ?? "" },
    onValidate({ formData }) {
      return parseWithZod(formData, {
        schema: config.schema as z.ZodType<Record<string, string>>,
      });
    },
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
  });
  const success = lastResult?.status === "success";
  return (
    <>
      {mode === "login" || mode === "signup" ? (
        <nav className="auth-tabs" aria-label="Twoje konto">
          <Link
            href="/sign-in"
            aria-current={mode === "login" ? "page" : undefined}
          >
            Logowanie
          </Link>
          <Link
            href="/sign-up"
            aria-current={mode === "signup" ? "page" : undefined}
          >
            Rejestracja
          </Link>
        </nav>
      ) : null}
      {success && mode === "forgot" ? (
        <div className="notice success" role="status">
          <Check size={18} />
          <span>
            Jeśli konto z tym adresem ma hasło, wyślemy link do jego zmiany.
            Sprawdź skrzynkę i folder spam.
          </span>
        </div>
      ) : null}
      {success && mode === "profile" ? (
        <div className="notice success" role="status">
          <Check size={18} /> Zmiany zostały zapisane.
        </div>
      ) : null}
      <form
        {...getFormProps(form)}
        action={action}
        className="auth-form"
        noValidate
      >
        {mode === "reset" ? (
          <input type="hidden" name="token" value={token ?? ""} />
        ) : null}
        {form.errors ? (
          <div id={form.errorId} className="notice error" role="alert">
            {form.errors}
          </div>
        ) : null}
        {fields.token?.errors ? (
          <div className="notice error" role="alert">
            Link jest nieprawidłowy.{" "}
            <Link href="/forgot-password">Poproś o nowy.</Link>
          </div>
        ) : null}
        <fieldset disabled={pending} className="form-fields">
          {config.fields.map((name) => (
            <FormField
              key={name}
              field={fields[name]}
              name={name}
              mode={mode}
            />
          ))}
          <Button type="submit" className="submit-button">
            {pending ? (
              <LoaderCircle className="animate-spin" size={18} />
            ) : null}
            {pending ? "Chwileczkę…" : config.submit}
            {!pending ? <ArrowRight size={17} /> : null}
          </Button>
        </fieldset>
      </form>
      {mode === "login" || mode === "signup" ? (
        <>
          <div className="auth-divider">
            <Separator />
            <span>lub kontynuuj z</span>
            <Separator />
          </div>
          <GoogleButton enabled={googleEnabled} />
          {!googleEnabled ? (
            <p className="field-hint text-center">
              Logowanie Google będzie dostępne wkrótce.
            </p>
          ) : null}
          <p className="auth-switch">
            {mode === "login"
              ? "Pierwszy raz w GamesDB?"
              : "Masz już swoje konto?"}{" "}
            <Link href={mode === "login" ? "/sign-up" : "/sign-in"}>
              {mode === "login" ? "Dołącz do nas" : "Zaloguj się"}{" "}
              <ArrowRight size={13} />
            </Link>
          </p>
        </>
      ) : null}
    </>
  );
}
function GoogleButton({ enabled }: { enabled: boolean }) {
  const [pending, setPending] = useState(false);
  return (
    <form action={googleSignIn} onSubmit={() => setPending(true)}>
      <Button
        type="submit"
        variant="outline"
        className="google-button"
        disabled={!enabled || pending}
      >
        {pending ? (
          <LoaderCircle className="animate-spin" />
        ) : (
          <Image src="/google.svg" alt="" width={18} height={18} />
        )}
        Kontynuuj z Google
      </Button>
    </form>
  );
}
