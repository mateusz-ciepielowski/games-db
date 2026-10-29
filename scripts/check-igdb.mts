import nextEnv from "@next/env";
import { createRequire } from "node:module";
nextEnv.loadEnvConfig(process.cwd());
const { requestGames } = createRequire(import.meta.url)(
  "../lib/igdb/client.ts",
) as typeof import("../lib/igdb/client");
try {
  const data = await requestGames(
    "fields id,name,cover.image_id; where cover != null; limit 3;",
  );
  const { gameSchema } = createRequire(import.meta.url)(
    "../lib/igdb/queries.ts",
  ) as typeof import("../lib/igdb/queries");
  const games = gameSchema.array().parse(data);
  console.log(
    `IGDB: połączenie poprawne. Pobrano ${games.length} gier z okładkami.`,
  );
  console.log(games.map((game) => game.name).join(", "));
} catch (error) {
  console.error(
    "IGDB: sprawdź IGDB_CLIENT_ID i token (lub IGDB_CLIENT_SECRET) w .env. Kod:",
    (error as { code?: string }).code ?? "invalid-response",
  );
  process.exitCode = 1;
}
