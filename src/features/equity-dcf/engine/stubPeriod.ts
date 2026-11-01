import { DcfInputError } from './errors';

const DAY_MS = 86_400_000;

/**
 * Parse a calendar date "YYYY-MM-DD" as a UTC day. `new Date("YYYY-MM-DD")` combined with local-time
 * getters shifts the day for users west of UTC; this never does.
 */
export function parseIsoDate(iso: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) throw new DcfInputError(`Date "${iso}" must use the YYYY-MM-DD format.`);
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const t = Date.UTC(y, m - 1, d);
  const check = new Date(t);
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) {
    throw new DcfInputError(`Date "${iso}" is not a valid calendar date.`);
  }
  return t;
}

/** Same calendar day one year earlier; 29 Feb falls back to 28 Feb. */
function oneYearEarlier(t: number): number {
  const d = new Date(t);
  const y = d.getUTCFullYear() - 1;
  const m = d.getUTCMonth();
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return Date.UTC(y, m, Math.min(d.getUTCDate(), lastDay));
}

/**
 * Day-accurate fraction of the fiscal year ending `periodEndDate` that remains after `valuationDate`.
 * Returns a value in (0, 1]. A valuation dated on the period end is not inside this period.
 */
export function yearFractionRemaining(valuationDate: string, periodEndDate: string): number {
  const valuation = parseIsoDate(valuationDate);
  const end = parseIsoDate(periodEndDate);
  const start = oneYearEarlier(end);
  if (valuation >= end) {
    throw new DcfInputError('The valuation date must fall before the end of the first forecast period.');
  }
  if (valuation < start) {
    throw new DcfInputError('The valuation date must fall within the first forecast period.');
  }
  return (end - valuation) / DAY_MS / ((end - start) / DAY_MS);
}
