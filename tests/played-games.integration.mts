// Real HTTP actions and PostgreSQL. Creates two synthetic accounts and removes its own data.
import assert from "node:assert/strict";
import { randomInt, randomUUID } from "node:crypto";
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
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const db = new PrismaClient();
const gameId = 1942;
const suffix = randomUUID().replaceAll("-", "").slice(0, 10);
const password = `QA played ${randomUUID()}!`;
const users: { id: string; email: string }[] = [];
const testStarted = new Date();
const fixtureBase = randomInt(1_900_000_000, 1_999_000_000);
const fixtureIds = Array.from(
  { length: 13 },
  (_, index) => fixtureBase + index,
);
const snapshotExisted = Boolean(
  await db.game.findUnique({ where: { id: gameId } }),
);
const decode = (s: string) =>
  s
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
function client() {
  const jar = new Map<string, string>();
  async function request(path: string, init: RequestInit = {}) {
    const headers = new Headers(init.headers);
    headers.set("origin", base);
    headers.set("cookie", [...jar].map(([k, v]) => `${k}=${v}`).join("; "));
    const response = await fetch(new URL(path, base), {
      ...init,
      headers,
      redirect: "manual",
    });
    for (const item of response.headers.getSetCookie()) {
      const first = item.split(";")[0];
      const i = first.indexOf("=");
      jar.set(first.slice(0, i), first.slice(i + 1));
    }
    const body = await response.text();
    assert.ok(response.status < 500, `${path}: server error`);
    return { body, response };
  }
  async function form(path: string, marker: string, selectedGame?: number) {
    const { body } = await request(path);
    const match = [...body.matchAll(/<form\b[^>]*>[\s\S]*?<\/form>/g)].find(
      (m) =>
        m[0].includes(`name="${marker}"`) &&
        (selectedGame === undefined ||
          m[0].includes(`value="${selectedGame}"`)),
    )?.[0];
    assert.ok(match, `Missing ${marker} form on ${path}`);
    const fields: [string, string][] = [];
    for (const input of match.matchAll(/<input\b[^>]*>/g)) {
      const attrs = Object.fromEntries(
        [...input[0].matchAll(/([\w$:\-]+)="([^"]*)"/g)].map((m) => [
          m[1],
          decode(m[2]),
        ]),
      );
      if (attrs.type === "hidden" && attrs.name)
        fields.push([attrs.name, attrs.value ?? ""]);
    }
    return fields;
  }
  async function submit(
    path: string,
    fields: [string, string][],
    values: Record<string, string> = {},
  ) {
    const data = new FormData();
    for (const [k, v] of fields) data.append(k, v);
    for (const [k, v] of Object.entries(values)) data.set(k, v);
    return request(path, { method: "POST", body: data });
  }
  return { request, form, submit };
}
const a = client();
const b = client();
const anonymous = client();
try {
  const guestPage = await anonymous.request(`/games/${gameId}`);
  assert.ok(guestPage.body.includes("Zaloguj się, aby oznaczyć jako ograne"));
  assert.ok(
    guestPage.body.includes("Gracze IGDB") &&
      guestPage.body.includes("Krytycy") &&
      guestPage.body.includes("Platformy"),
  );
  const screenshots = [...guestPage.body.matchAll(/alt="Screenshot \d+ z gry/g)]
    .length;
  assert.ok(screenshots > 0 && screenshots <= 3);
  console.log("PASS real IGDB details, screenshots, and guest sign-in prompt");
  for (const [actor, letter] of [
    [a, "a"],
    [b, "b"],
  ] as const) {
    const email = `qa_played_${suffix}_${letter}@example.invalid`;
    const user = await db.user.create({
      data: {
        name: `QA played ${letter}`,
        username: `qa_${suffix}_${letter}`,
        email,
        password: await bcrypt.hash(password, 12),
      },
    });
    users.push({ id: user.id, email });
    await actor.submit("/sign-in", await actor.form("/sign-in", "identifier"), {
      identifier: email,
      password,
    });
    assert.equal(
      JSON.parse((await actor.request("/api/auth/session")).body).user?.id,
      user.id,
    );
  }
  const addA = await a.form(`/games/${gameId}`, "gameId", gameId);
  const unauthorized = await anonymous.submit(`/games/${gameId}`, addA, {
    gameId: String(gameId),
    played: "true",
    userId: users[0].id,
  });
  assert.ok(
    unauthorized.response.headers.get("location")?.includes("/sign-in") ||
      unauthorized.body.includes("/sign-in"),
  );
  assert.equal(
    await db.playedGame.count({
      where: { userId: { in: users.map((u) => u.id) } },
    }),
    0,
  );
  console.log("PASS unauthenticated direct action cannot modify lists");

  const wantA = await a.form(`/games/${gameId}`, "wishlistIntent", gameId);
  const guestWant = await anonymous.submit(`/games/${gameId}`, wantA);
  assert.ok(
    guestWant.response.headers.get("location")?.includes("/sign-in") ||
      guestWant.body.includes("/sign-in"),
  );
  assert.equal(
    await db.wishlistGame.count({
      where: { userId: { in: users.map((u) => u.id) } },
    }),
    0,
  );
  const invalidWant = await a.submit(`/games/${gameId}`, wantA, {
    gameId: "0",
  });
  assert.ok(invalidWant.body.includes("Nieprawidłowe dane gry"));
  await a.submit(`/games/${gameId}`, wantA, {
    userId: users[1].id,
    name: "Forged title",
  });
  await a.submit(`/games/${gameId}`, wantA);
  assert.equal(
    await db.wishlistGame.count({ where: { userId: users[0].id, gameId } }),
    1,
  );
  assert.equal(
    await db.wishlistGame.count({ where: { userId: users[1].id, gameId } }),
    0,
  );
  assert.equal(
    (await db.game.findUniqueOrThrow({ where: { id: gameId } })).name,
    "The Witcher 3: Wild Hunt",
  );
  const wishlistSection = (html: string) =>
    html.match(
      /<section[^>]*id="wishlist-games"[^>]*>([\s\S]*?)<\/section>/,
    )?.[1] ?? "";
  assert.ok(
    wishlistSection((await a.request("/dashboard")).body).includes(
      "The Witcher 3: Wild Hunt",
    ),
  );
  assert.ok(
    !wishlistSection((await b.request("/dashboard")).body).includes(
      "The Witcher 3: Wild Hunt",
    ),
  );
  const moveA = await a.form("/dashboard", "wishlistIntent", gameId);
  const foreignMove = await b.submit("/dashboard", moveA, {
    wishlistIntent: "played",
    userId: users[0].id,
  });
  assert.ok(foreignMove.body.includes("Gra nie znajduje się na Twojej liście"));
  assert.equal(
    await db.wishlistGame.count({ where: { userId: users[0].id, gameId } }),
    1,
  );
  await b.submit(
    `/games/${gameId}`,
    await b.form(`/games/${gameId}`, "wishlistIntent", gameId),
  );
  await a.submit("/dashboard", moveA, { wishlistIntent: "remove" });
  assert.equal(
    await db.wishlistGame.count({ where: { userId: users[0].id, gameId } }),
    0,
  );
  assert.equal(
    await db.wishlistGame.count({ where: { userId: users[1].id, gameId } }),
    1,
  );
  await a.submit(`/games/${gameId}`, wantA);
  await a.submit("/dashboard", moveA, { wishlistIntent: "played" });
  await a.submit("/dashboard", moveA, { wishlistIntent: "played" });
  assert.equal(
    await db.wishlistGame.count({ where: { userId: users[0].id, gameId } }),
    0,
  );
  assert.equal(
    await db.wishlistGame.count({ where: { userId: users[1].id, gameId } }),
    1,
  );
  assert.equal(
    (
      await db.playedGame.findUniqueOrThrow({
        where: { userId_gameId: { userId: users[0].id, gameId } },
      })
    ).rating,
    null,
  );
  assert.ok(
    (await a.request(`/games/${gameId}`)).body.includes(
      'aria-label="Usuń z ogranych"',
    ),
  );
  assert.ok(
    !wishlistSection((await a.request("/dashboard")).body).includes(
      "The Witcher 3: Wild Hunt",
    ),
  );
  const alreadyPlayed = await a.submit(`/games/${gameId}`, wantA);
  assert.ok(
    alreadyPlayed.body.includes("Ta gra jest już na Twojej liście ogranych"),
  );
  await b.submit(
    `/games/${gameId}`,
    await b.form(`/games/${gameId}`, "wishlistIntent", gameId),
    { wishlistIntent: "remove" },
  );
  await a.submit(`/games/${gameId}`, addA, { played: "false" });
  // Concurrent writes to different lists must still leave a single, played entry.
  await Promise.all([
    a.submit(`/games/${gameId}`, wantA),
    a.submit(`/games/${gameId}`, addA, { played: "true" }),
  ]);
  assert.equal(
    await db.playedGame.count({ where: { userId: users[0].id, gameId } }),
    1,
  );
  assert.equal(
    await db.wishlistGame.count({ where: { userId: users[0].id, gameId } }),
    0,
  );
  await a.submit(`/games/${gameId}`, addA, { played: "false" });
  console.log(
    "PASS wishlist add/remove, guest and ownership guards, idempotent transfer, canonical metadata and concurrent list exclusivity",
  );

  await a.submit(`/games/${gameId}`, addA, {
    played: "true",
    userId: users[1].id,
    name: "Forged title",
    coverImageId: "forged",
  });
  assert.equal(
    await db.playedGame.count({ where: { userId: users[0].id, gameId } }),
    1,
  );
  assert.equal(
    await db.playedGame.count({ where: { userId: users[1].id } }),
    0,
  );
  assert.equal(
    (await db.game.findUniqueOrThrow({ where: { id: gameId } })).name,
    "The Witcher 3: Wild Hunt",
  );
  assert.ok(
    (await a.request("/dashboard")).body.includes("The Witcher 3: Wild Hunt"),
  );
  assert.ok(
    !(await b.request("/dashboard")).body.includes("The Witcher 3: Wild Hunt"),
  );
  console.log(
    "PASS session ownership, canonical IGDB metadata, profile persistence, and list isolation",
  );

  const rateA = await a.form(`/games/${gameId}`, "rating", gameId);
  const unauthorizedRating = await anonymous.submit(`/games/${gameId}`, rateA, {
    rating: "8",
  });
  assert.ok(
    unauthorizedRating.response.headers.get("location")?.includes("/sign-in") ||
      unauthorizedRating.body.includes("/sign-in"),
  );
  const notPlayed = await b.submit(`/games/${gameId}`, rateA, {
    rating: "8",
    userId: users[0].id,
  });
  assert.ok(notPlayed.body.includes("Najpierw oznacz tę grę jako ograną"));
  assert.equal(
    (
      await db.playedGame.findUniqueOrThrow({
        where: { userId_gameId: { userId: users[0].id, gameId } },
      })
    ).rating,
    null,
  );
  await a.submit(`/games/${gameId}`, rateA, {
    rating: "8",
    userId: users[1].id,
  });
  assert.equal(
    (
      await db.playedGame.findUniqueOrThrow({
        where: { userId_gameId: { userId: users[0].id, gameId } },
      })
    ).rating,
    8,
  );
  assert.ok((await a.request(`/games/${gameId}`)).body.includes("8 / 10"));
  assert.ok((await a.request("/dashboard")).body.includes("8 / 10"));
  for (const rating of ["0", "11", "5.5", ""]) {
    const invalidRating = await a.submit(`/games/${gameId}`, rateA, { rating });
    assert.ok(
      invalidRating.body.includes("Wybierz całkowitą ocenę od 1 do 10"),
    );
  }
  await assert.rejects(
    db.playedGame.updateMany({
      where: { userId: users[0].id, gameId },
      data: { rating: 11 },
    }),
  );
  console.log(
    "PASS personal rating persists on game and profile; guest, unplayed and invalid ratings are blocked, including by PostgreSQL",
  );

  await a.submit(`/games/${gameId}`, addA, { played: "true" });
  assert.equal(
    (
      await db.playedGame.findUniqueOrThrow({
        where: { userId_gameId: { userId: users[0].id, gameId } },
      })
    ).rating,
    8,
  );
  assert.equal(
    await db.playedGame.count({ where: { userId: users[0].id, gameId } }),
    1,
  );
  const addB = await b.form(`/games/${gameId}`, "gameId", gameId);
  await b.submit(`/games/${gameId}`, addB, {
    played: "false",
    userId: users[0].id,
  });
  assert.equal(
    await db.playedGame.count({ where: { userId: users[0].id, gameId } }),
    1,
  );
  await b.submit(`/games/${gameId}`, addB, { played: "true" });
  assert.equal(
    await db.playedGame.count({
      where: { userId: { in: users.map((u) => u.id) }, gameId },
    }),
    2,
  );
  console.log(
    "PASS repeated add is idempotent; two users can independently mark the same game",
  );

  await b.submit(
    `/games/${gameId}`,
    await b.form(`/games/${gameId}`, "rating", gameId),
    { rating: "3" },
  );
  await a.submit("/dashboard", await a.form("/dashboard", "rating", gameId), {
    rating: "10",
    userId: users[1].id,
  });
  assert.equal(
    (
      await db.playedGame.findUniqueOrThrow({
        where: { userId_gameId: { userId: users[0].id, gameId } },
      })
    ).rating,
    10,
  );
  assert.equal(
    (
      await db.playedGame.findUniqueOrThrow({
        where: { userId_gameId: { userId: users[1].id, gameId } },
      })
    ).rating,
    3,
  );
  assert.ok((await a.request(`/games/${gameId}`)).body.includes("10 / 10"));
  console.log(
    "PASS editing from the profile refreshes the game page and preserves the other user's rating",
  );

  await a.submit("/dashboard", await a.form("/dashboard", "gameId", gameId), {
    played: "false",
  });
  assert.equal(
    await db.playedGame.count({ where: { userId: users[0].id, gameId } }),
    0,
  );
  assert.equal(
    await db.playedGame.count({ where: { userId: users[1].id, gameId } }),
    1,
  );
  assert.ok(
    (await a.request("/dashboard")).body.includes(
      "Każda lista zaczyna się od jednej gry",
    ),
  );
  assert.ok(
    (await a.request(`/games/${gameId}`)).body.includes(
      'aria-label="Oznacz jako ograne"',
    ),
  );
  console.log(
    "PASS removal from profile updates the game page and preserves the other user's entry",
  );

  const invalid = await a.submit(`/games/${gameId}`, addA, {
    gameId: "2147483648",
    played: "true",
  });
  assert.ok(invalid.body.includes("Nieprawidłowe dane gry"));
  console.log("PASS invalid action payload is rejected");

  await db.$transaction([
    db.game.createMany({
      data: fixtureIds.map((id, index) => ({
        id,
        name: `QA pagination ${suffix} ${index === 0 ? "Alpha 100%_Hero" : index === 1 ? "Beta" : index === 2 ? "Gamma" : index === 3 ? "100XXYHero" : `Title ${String(index).padStart(2, "0")}`}`,
      })),
    }),
    db.playedGame.createMany({
      data: fixtureIds.map((gameId, index) => ({
        userId: users[0].id,
        gameId,
        rating:
          index === 0
            ? null
            : index === 1
              ? 4
              : index === 2
                ? 10
                : index === 3
                  ? 2
                  : 6,
        addedAt: new Date(Date.UTC(2000, 0, index + 1)),
      })),
    }),
  ]);
  const firstPage = await a.request("/dashboard");
  const secondPage = await a.request("/dashboard?playedPage=2");
  const outOfRange = await a.request("/dashboard?playedPage=999999");
  const cardCount = (html: string) =>
    [...html.matchAll(/<article class="game-card"/g)].length;
  assert.equal(cardCount(firstPage.body), 12);
  assert.equal(cardCount(secondPage.body), 1);
  assert.equal(cardCount(outOfRange.body), 1);
  assert.ok(
    !(await b.request("/dashboard")).body.includes(`QA pagination ${suffix}`),
  );
  console.log(
    "PASS profile pagination exposes all 13 entries only to their owner and bounds invalid pages",
  );
  const cardIds = (html: string) =>
    [...html.matchAll(/<article class="game-card">([\s\S]*?)<\/article>/g)].map(
      (match) => Number(match[1].match(/href="\/games\/(\d+)"/)?.[1]),
    );
  for (const [sort, first] of [
    ["rating_desc", fixtureIds[2]],
    ["rating_asc", fixtureIds[3]],
    ["name_asc", fixtureIds[3]],
    ["name_desc", fixtureIds[12]],
    ["added_asc", fixtureIds[0]],
    ["added_desc", fixtureIds[12]],
  ] as const) {
    assert.equal(
      cardIds((await a.request(`/dashboard?playedSort=${sort}`)).body)[0],
      first,
      sort,
    );
  }
  assert.equal(
    cardIds(
      (await a.request("/dashboard?playedSort=rating_desc&playedPage=2")).body,
    ).at(-1),
    fixtureIds[0],
  );
  assert.equal(
    cardIds(
      (await a.request("/dashboard?playedSort=rating_asc&playedPage=2")).body,
    ).at(-1),
    fixtureIds[0],
  );
  const literal = await a.request(
    `/dashboard?playedQ=${encodeURIComponent("100%_Hero")}`,
  );
  assert.deepEqual(cardIds(literal.body), [fixtureIds[0]]);
  assert.deepEqual(
    cardIds((await a.request("/dashboard?playedQ=alpha")).body),
    [fixtureIds[0]],
  );
  assert.equal(
    cardCount(
      (await a.request("/dashboard?playedQ=no-matching-title-83729")).body,
    ),
    0,
  );
  assert.ok(
    (
      await a.request("/dashboard?playedQ=no-matching-title-83729")
    ).body.includes("Nie znaleziono pasujących gier"),
  );
  const query = `playedQ=${encodeURIComponent(`QA pagination ${suffix}`)}&playedSort=name_asc`;
  const filteredPage = await a.request(`/dashboard?${query}`);
  assert.equal(cardCount(filteredPage.body), 12);
  assert.ok(
    decode(filteredPage.body).includes(
      `playedSort=name_asc&playedPage=2#played-games`,
    ),
  );
  assert.equal(
    cardCount((await a.request(`/dashboard?${query}&playedPage=2`)).body),
    1,
  );
  assert.equal(
    cardCount(
      (await b.request(`/dashboard?${query}&userId=${users[0].id}`)).body,
    ),
    0,
  );
  console.log(
    "PASS title search, literal wildcard escaping, all six sort orders, unrated-last, filtered pagination and owner isolation",
  );
  await db.wishlistGame.createMany({
    data: fixtureIds.map((gameId) => ({ userId: users[1].id, gameId })),
  });
  assert.equal(
    cardCount(wishlistSection((await b.request("/dashboard")).body)),
    12,
  );
  assert.equal(
    cardCount(
      wishlistSection((await b.request("/dashboard?wantedPage=2")).body),
    ),
    1,
  );
  assert.equal(
    cardCount(
      wishlistSection((await b.request("/dashboard?wantedPage=999999")).body),
    ),
    1,
  );
  assert.equal(
    cardCount(wishlistSection((await a.request("/dashboard")).body)),
    0,
  );
  // Synthetic game IDs do not exist in IGDB: transfer must use the saved snapshot.
  await b.submit(
    "/dashboard",
    await b.form("/dashboard", "wishlistIntent", fixtureIds[12]),
    { wishlistIntent: "played" },
  );
  assert.equal(
    await db.wishlistGame.count({
      where: { userId: users[1].id, gameId: fixtureIds[12] },
    }),
    0,
  );
  assert.equal(
    await db.playedGame.count({
      where: { userId: users[1].id, gameId: fixtureIds[12] },
    }),
    1,
  );
  assert.equal(
    await db.playedGame.count({
      where: { userId: users[0].id, gameId: fixtureIds[12] },
    }),
    1,
  );
  console.log(
    "PASS independent wishlist pagination, owner isolation and transfer without IGDB",
  );
  const futureId = fixtureIds[11];
  await db.game.update({
    where: { id: futureId },
    data: { firstReleaseDate: new Date("2099-01-01T00:00:00Z") },
  });
  const beforeRating = await db.playedGame.findUniqueOrThrow({
    where: { userId_gameId: { userId: users[0].id, gameId: futureId } },
  });
  // Reuse a real rating action to simulate submitting despite the hidden/disabled UI.
  const blockedRating = await a.submit("/dashboard", rateA, {
    gameId: String(futureId),
    rating: "10",
  });
  assert.ok(blockedRating.body.includes("Gra jeszcze nie miała premiery"));
  assert.equal(
    (
      await db.playedGame.findUniqueOrThrow({
        where: { userId_gameId: { userId: users[0].id, gameId: futureId } },
      })
    ).rating,
    beforeRating.rating,
  );
  const futureMove = await b.form("/dashboard", "wishlistIntent", futureId);
  const blockedMove = await b.submit("/dashboard", futureMove, {
    wishlistIntent: "played",
  });
  assert.ok(blockedMove.body.includes("Gra jeszcze nie miała premiery"));
  assert.equal(
    await db.wishlistGame.count({
      where: { userId: users[1].id, gameId: futureId },
    }),
    1,
  );
  assert.equal(
    await db.playedGame.count({
      where: { userId: users[1].id, gameId: futureId },
    }),
    0,
  );
  console.log(
    "PASS future release blocks forged rating and wishlist transfer without changing data",
  );
} finally {
  await db.user.deleteMany({
    where: {
      id: { in: users.map((user) => user.id) },
      email: { endsWith: "@example.invalid" },
    },
  });
  if (!snapshotExisted)
    await db.game.deleteMany({
      where: {
        id: gameId,
        createdAt: { gte: testStarted },
        playedBy: { none: {} },
        wantedBy: { none: {} },
      },
    });
  await db.game.deleteMany({
    where: {
      id: { in: fixtureIds },
      name: { startsWith: `QA pagination ${suffix}` },
      playedBy: { none: {} },
      wantedBy: { none: {} },
    },
  });
  await db.$disconnect();
  console.log("Cleaned up synthetic accounts and their test entries");
}
