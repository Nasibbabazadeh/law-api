/** How far in the future a client clock may be before an attempt is rejected. */
export const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

/** Earliest accepted answer time; anything older is a broken client clock. */
export const EARLIEST_ANSWERED_AT = new Date('2024-01-01T00:00:00Z');

/** Why an `answeredAt` instant is not acceptable, or null when it is fine. */
export function answeredAtProblem(answeredAt: Date, now: Date): string | null {
  if (Number.isNaN(answeredAt.getTime())) return 'answeredAt is not a valid instant';
  if (answeredAt.getTime() > now.getTime() + MAX_CLOCK_SKEW_MS) {
    return 'answeredAt is in the future';
  }
  if (answeredAt < EARLIEST_ANSWERED_AT) return 'answeredAt is too far in the past';
  return null;
}
