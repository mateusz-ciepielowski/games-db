// Mocked network: validates token renewal and errors without contacting Twitch/IGDB.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const { requestGames, IgdbError } = createRequire(import.meta.url)(
  "../lib/igdb/client.ts",
) as typeof import("../lib/igdb/client");
const originalFetch = globalThis.fetch;
const originalEnv = {
  id: process.env.IGDB_CLIENT_ID,
  token: process.env.IGDB_ACCESS_TOKEN,
  secret: process.env.IGDB_CLIENT_SECRET,
};
try {
  process.env.IGDB_CLIENT_ID = "test-client";
  process.env.IGDB_ACCESS_TOKEN = "test-token";
  delete process.env.IGDB_CLIENT_SECRET;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "https://api.igdb.com/v4/games");
    assert.equal(options?.method, "POST");
    const headers = new Headers(options?.headers);
    assert.equal(headers.get("Authorization"), "Bearer test-token");
    assert.equal(headers.get("Client-ID"), "test-client");
    return Response.json([{ id: 1, name: "Test" }]);
  };
  assert.deepEqual(await requestGames("fields name;"), [
    { id: 1, name: "Test" },
  ]);
  console.log("PASS server request sends the expected headers and method");

  globalThis.fetch = async () => new Response(null, { status: 401 });
  await assert.rejects(
    requestGames("fields name;"),
    (error) => error instanceof IgdbError && error.code === "authorization",
  );
  globalThis.fetch = async () => new Response(null, { status: 429 });
  await assert.rejects(
    requestGames("fields name;"),
    (error) => error instanceof IgdbError && error.code === "rate-limit",
  );
  globalThis.fetch = async () => {
    throw new Error("Private upstream details");
  };
  await assert.rejects(
    requestGames("fields name;"),
    (error) =>
      error instanceof IgdbError &&
      error.code === "unavailable" &&
      !error.message.includes("Private"),
  );
  console.log("PASS errors are classified without exposing upstream details");

  process.env.IGDB_CLIENT_SECRET = "test-secret";
  let tokenCalls = 0;
  let gameCalls = 0;
  globalThis.fetch = async (url, options) => {
    if (url === "https://id.twitch.tv/oauth2/token") {
      tokenCalls++;
      assert.ok(options?.body instanceof URLSearchParams);
      assert.equal(options.body.get("grant_type"), "client_credentials");
      return Response.json({
        access_token: `token-${tokenCalls}`,
        expires_in: 3600,
      });
    }
    gameCalls++;
    if (gameCalls === 1) return new Response(null, { status: 401 });
    assert.equal(
      new Headers(options?.headers).get("Authorization"),
      "Bearer token-2",
    );
    return Response.json([]);
  };
  await requestGames("fields name;");
  await requestGames("fields id;");
  assert.equal(tokenCalls, 2);
  assert.equal(gameCalls, 3);
  console.log(
    "PASS automatic app token renewal after 401 and reuse of the new token",
  );
} finally {
  globalThis.fetch = originalFetch;
  for (const [key, value] of Object.entries({
    IGDB_CLIENT_ID: originalEnv.id,
    IGDB_ACCESS_TOKEN: originalEnv.token,
    IGDB_CLIENT_SECRET: originalEnv.secret,
  })) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}
