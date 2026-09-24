/**
 * Money in this system is THB as a plain number.
 *
 * Postgres returns `decimal(10,2)` columns as strings over PostgREST, so every
 * price read out of the DB goes through `toThb`. Note this differs from
 * odys-vendor's mock API, which uses integer satang (`priceMinor`) — that app
 * will need reconciling when it moves onto this backend.
 */

/** Parse a PostgREST decimal (string | number | null) into a THB number. */
export function toThb(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === 'number' ? value : Number.parseFloat(value);
  return Number.isFinite(n) ? round2(n) : 0;
}

/** Round to satang precision, avoiding float drift (0.1 + 0.2 style). */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export const SERVICE_FEE_RATE = 0.1;

/** Platform service fee, rounded to whole baht to match what the UI displays. */
export function serviceFee(subtotalThb: number): number {
  return Math.round(subtotalThb * SERVICE_FEE_RATE);
}
