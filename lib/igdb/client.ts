import "server-only";
import { setTimeout as delay } from "node:timers/promises";
import { z } from "zod";

export class IgdbError extends Error {
  constructor(
    public readonly code:
      | "configuration"
      | "authorization"
      | "rate-limit"
      | "unavailable",
  ) {
    super(`IGDB: ${code}`);
  }
}
let appToken: { value: string; expiresAt: number } | undefined;
let tokenRequest: Promise<string> | undefined;
// Process-local throttle for this external API only; no user data is stored here.
let queue: Promise<unknown> = Promise.resolve();
let nextRequestAt = 0;

async function getToken(): Promise<string> {
  if (!process.env.IGDB_CLIENT_ID) throw new IgdbError("configuration");
  if (!process.env.IGDB_CLIENT_SECRET) {
    if (!process.env.IGDB_ACCESS_TOKEN) throw new IgdbError("configuration");
    return process.env.IGDB_ACCESS_TOKEN.replace(/^Bearer\s+/i, "").trim();
  }
  if (appToken && appToken.expiresAt > Date.now()) return appToken.value;
  if (tokenRequest) return tokenRequest;
  tokenRequest = (async () => {
    const response = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.IGDB_CLIENT_ID!,
        client_secret: process.env.IGDB_CLIENT_SECRET!,
        grant_type: "client_credentials",
      }),
    });
    if (!response.ok) throw new IgdbError("authorization");
    const data = z
      .object({ access_token: z.string(), expires_in: z.number().positive() })
      .parse(await response.json());
    appToken = {
      value: data.access_token,
      expiresAt: Date.now() + Math.max(0, data.expires_in - 60) * 1000,
    };
    return appToken.value;
  })();
  try {
    return await tokenRequest;
  } finally {
    tokenRequest = undefined;
  }
}

async function execute(body: string) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const token = await getToken();
    await delay(Math.max(0, nextRequestAt - Date.now()));
    nextRequestAt = Date.now() + 275;
    const response = await fetch("https://api.igdb.com/v4/games", {
      method: "POST",
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
      headers: {
        "Client-ID": process.env.IGDB_CLIENT_ID!,
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "text/plain",
      },
      body,
    });
    if (
      response.status === 401 &&
      attempt === 0 &&
      process.env.IGDB_CLIENT_SECRET
    ) {
      appToken = undefined;
      continue;
    }
    if (response.status === 401 || response.status === 403)
      throw new IgdbError("authorization");
    if (response.status === 429) throw new IgdbError("rate-limit");
    if (!response.ok) throw new IgdbError("unavailable");
    return response.json() as Promise<unknown>;
  }
  throw new IgdbError("authorization");
}

export async function requestGames(body: string): Promise<unknown> {
  const request = queue.then(() => execute(body));
  queue = request.catch(() => undefined);
  try {
    return await request;
  } catch (error) {
    if (error instanceof IgdbError) throw error;
    // Never forward upstream responses, request headers or credentials to UI/logs.
    throw new IgdbError("unavailable");
  }
}
