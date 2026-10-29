export const databaseProjectRef = "oiaaejqnckqdvdautzbb";

export function assertDatabaseTarget(
  value: string | undefined,
  name = "DATABASE_URL",
) {
  if (!value)
    throw new Error(
      `Uzupełnij ${name} danymi projektu Supabase games-db w .env.`,
    );
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name}: nieprawidłowy connection string.`);
  }
  const direct =
    url.hostname === `db.${databaseProjectRef}.supabase.co` &&
    url.username === "postgres";
  const pooled =
    url.hostname.endsWith(".pooler.supabase.com") &&
    decodeURIComponent(url.username).endsWith(`.${databaseProjectRef}`);
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    (!direct && !pooled) ||
    url.searchParams.get("schema") !== "games_db"
  ) {
    throw new Error(
      `${name} musi wskazywać projekt games-db (${databaseProjectRef}) i schema=games_db. Połączenie z innym projektem jest zablokowane.`,
    );
  }
}
