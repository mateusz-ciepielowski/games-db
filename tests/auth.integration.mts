// Runs against the local app and real games_db schema. Only synthetic data is created.
import assert from "node:assert/strict";
import { createHash, createHmac, randomUUID } from "node:crypto";
import nextEnv from "@next/env";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { createRequire } from "node:module";
const { assertDatabaseTarget } = createRequire(import.meta.url)(
  "../lib/database-target.ts",
) as typeof import("../lib/database-target");

nextEnv.loadEnvConfig(process.cwd());
assertDatabaseTarget(process.env.DATABASE_URL);
const base = process.env.TEST_BASE_URL ?? "http://localhost:3000";
assert.ok(
  ["localhost", "127.0.0.1"].includes(new URL(base).hostname),
  "Tests only run against localhost",
);
assert.equal(
  new URL(process.env.DATABASE_URL!).searchParams.get("schema"),
  "games_db",
);
const db = new PrismaClient();
const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
const username = `qa_${suffix}`;
const email = `${username}@example.invalid`;
const password = `QA initial ${randomUUID().slice(0, 12)}!`;
const nextPassword = `QA changed ${randomUUID().slice(0, 12)}!`;
const resetPassword = `QA reset ${randomUUID().slice(0, 12)}!`;
const cookies = new Map<string, string>();
const resetTokens: string[] = [];
let userId: string | undefined;

async function request(path: string, init: RequestInit = {}, jar = cookies) {
  const headers = new Headers(init.headers);
  headers.set("cookie", [...jar].map(([k, v]) => `${k}=${v}`).join("; "));
  headers.set("origin", base);
  const response = await fetch(new URL(path, base), {
    ...init,
    headers,
    redirect: "manual",
  });
  for (const cookie of response.headers.getSetCookie()) {
    const first = cookie.split(";")[0];
    const index = first.indexOf("=");
    jar.set(first.slice(0, index), first.slice(index + 1));
  }
  const body = await response.text();
  assert.ok(response.status < 500, `${path}: server error`);
  return { response, body };
}
function decode(value: string) {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}
async function submit(
  path: string,
  marker: string,
  values: Record<string, string>,
  jar = cookies,
) {
  const { body } = await request(path, {}, jar);
  const form = [...body.matchAll(/<form\b[^>]*>[\s\S]*?<\/form>/g)].find(
    (match) => match[0].includes(`name="${marker}"`),
  )?.[0];
  assert.ok(form, `Missing ${marker} form on ${path}`);
  const data = new FormData();
  for (const input of form.matchAll(/<input\b[^>]*>/g)) {
    const attributes = Object.fromEntries(
      [...input[0].matchAll(/([\w$:\-]+)="([^"]*)"/g)].map((m) => [
        m[1],
        decode(m[2]),
      ]),
    );
    if (attributes.type === "hidden" && attributes.name)
      data.append(attributes.name, attributes.value ?? "");
  }
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return request(path, { method: "POST", body: data }, jar);
}
async function session(jar = cookies) {
  return JSON.parse((await request("/api/auth/session", {}, jar)).body);
}
const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");

try {
  const anonymous = await request("/dashboard");
  assert.ok(
    anonymous.response.headers.get("location")?.includes("/sign-in") ||
      anonymous.body.includes("/sign-in"),
  );
  console.log("PASS anonymous dashboard is protected");

  const invalid = await submit("/sign-up", "username", {
    username,
    email,
    password,
    confirmPassword: "Different password",
  });
  assert.ok(invalid.body.includes("Hasła muszą być takie same"));
  assert.equal(await db.user.count({ where: { email } }), 0);
  console.log("PASS server rejects mismatched passwords");

  await submit("/sign-up", "username", {
    username,
    email,
    password,
    confirmPassword: password,
  });
  const user = await db.user.findUnique({ where: { email } });
  assert.ok(user?.password);
  userId = user.id;
  assert.notEqual(user.password, password);
  assert.ok(await bcrypt.compare(password, user.password));
  console.log("PASS signup stores a bcrypt hash in games_db");

  const duplicate = await submit("/sign-up", "username", {
    username,
    email,
    password,
    confirmPassword: password,
  });
  assert.ok(duplicate.body.includes("już zajęte"));
  console.log("PASS duplicate registration is handled");

  const wrong = await submit("/sign-in", "identifier", {
    identifier: email,
    password: "Wrong password123",
  });
  assert.ok(wrong.body.includes("Nieprawidłowy login"));
  assert.ok(!(await session())?.user);
  console.log("PASS wrong password does not create a session");

  await submit("/sign-in", "identifier", {
    identifier: username.toUpperCase(),
    password,
  });
  assert.equal((await session()).user?.id, user.id);
  assert.ok((await request("/dashboard")).body.includes("Twój profil"));
  console.log("PASS username login, signed session and protected dashboard");

  await submit("/dashboard", "name", { name: "Gracz testowy" });
  assert.equal(
    (await db.user.findUniqueOrThrow({ where: { id: user.id } })).name,
    "Gracz testowy",
  );
  console.log("PASS profile update uses the authenticated user");

  const staleCookies = new Map(cookies);
  await submit("/dashboard", "currentPassword", {
    currentPassword: password,
    password: nextPassword,
    confirmPassword: nextPassword,
  });
  assert.ok(!(await session(staleCookies))?.user);
  assert.ok(
    await bcrypt.compare(
      nextPassword,
      (await db.user.findUniqueOrThrow({ where: { id: user.id } })).password!,
    ),
  );
  console.log("PASS password change invalidates an earlier session");

  cookies.clear();
  await submit("/sign-in", "identifier", {
    identifier: email,
    password: nextPassword,
  });
  assert.equal((await session()).user?.id, user.id);
  console.log("PASS email login after password change");

  const token = randomUUID();
  resetTokens.push(token);
  await db.verificationToken.create({
    data: {
      identifier: `reset:${user.id}`,
      token: digest(token),
      expires: new Date(Date.now() + 60_000),
    },
  });
  const beforeReset = new Map(cookies);
  await submit(`/reset-password?token=${token}`, "token", {
    token,
    password: resetPassword,
    confirmPassword: resetPassword,
  });
  assert.ok(!(await session(beforeReset))?.user);
  assert.ok(
    await bcrypt.compare(
      resetPassword,
      (await db.user.findUniqueOrThrow({ where: { id: user.id } })).password!,
    ),
  );
  const reused = await submit(`/reset-password?token=${token}`, "token", {
    token,
    password: nextPassword,
    confirmPassword: nextPassword,
  });
  assert.ok(reused.body.includes("Link wygasł lub został już użyty"));
  console.log("PASS reset consumes hashed token once and invalidates sessions");

  const expired = randomUUID();
  resetTokens.push(expired);
  await db.verificationToken.create({
    data: {
      identifier: `reset:${user.id}`,
      token: digest(expired),
      expires: new Date(Date.now() - 60_000),
    },
  });
  const expiredResponse = await submit(
    `/reset-password?token=${expired}`,
    "token",
    { token: expired, password: nextPassword, confirmPassword: nextPassword },
  );
  assert.ok(expiredResponse.body.includes("Link wygasł lub został już użyty"));
  console.log("PASS expired reset token is rejected");

  cookies.clear();
  await submit("/sign-in", "identifier", {
    identifier: email,
    password: resetPassword,
  });
  assert.equal((await session()).user?.id, user.id);
  const page = await request("/dashboard");
  const logoutForm = [
    ...page.body.matchAll(/<form\b[^>]*>[\s\S]*?<\/form>/g),
  ].find((m) => m[0].includes("Wyloguj się"))?.[0];
  assert.ok(logoutForm);
  const actionName = logoutForm.match(/name="(\$ACTION_ID_[^"]+)"/)?.[1];
  assert.ok(actionName);
  const logoutData = new FormData();
  logoutData.set(actionName, "");
  await request("/dashboard", { method: "POST", body: logoutData });
  assert.ok(!(await session())?.user);
  console.log("PASS logout removes the session");

  const key = createHmac("sha256", process.env.AUTH_SECRET!)
    .update(`login:${username}`)
    .digest("hex");
  await db.authRateLimit.upsert({
    where: { key },
    create: { key, attempts: 8, expiresAt: new Date(Date.now() + 60_000) },
    update: { attempts: 8, expiresAt: new Date(Date.now() + 60_000) },
  });
  await submit("/sign-in", "identifier", {
    identifier: username,
    password: resetPassword,
  });
  assert.ok(!(await session())?.user);
  console.log("PASS database rate limit blocks further login attempts");
} finally {
  if (userId) {
    await db.verificationToken.deleteMany({
      where: { identifier: `reset:${userId}` },
    });
    await db.user.deleteMany({ where: { id: userId, email } });
  }
  const scopes = [
    `signup:${email}`,
    `login:${username}`,
    `login:${email}`,
    ...(userId ? [`change-password:${userId}`] : []),
    ...resetTokens.map((t) => `reset-token:${t}`),
  ];
  await db.authRateLimit.deleteMany({
    where: {
      key: {
        in: scopes.map((value) =>
          createHmac("sha256", process.env.AUTH_SECRET!)
            .update(value)
            .digest("hex"),
        ),
      },
    },
  });
  await db.$disconnect();
  console.log("Cleaned up synthetic test data");
}
