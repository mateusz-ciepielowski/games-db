// Release dates are UTC calendar days; today follows the user's Polish timezone.
export function releaseDayLimit(now = new Date()) {
  const today = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Warsaw",
  }).format(now);
  const limit = new Date(`${today}T00:00:00.000Z`);
  limit.setUTCDate(limit.getUTCDate() + 1);
  return limit;
}
export function isUnreleased(date: Date | null | undefined, now = new Date()) {
  return date != null && date.getTime() >= releaseDayLimit(now).getTime();
}
export const unreleasedMessage =
  "Gra jeszcze nie miała premiery. Nie można oznaczyć jej jako ogranej ani wystawić oceny.";
export class UnreleasedGameError extends Error {
  constructor() {
    super(unreleasedMessage);
  }
}
