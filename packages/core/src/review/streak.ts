import { addDays, type StudyDay } from '../time/study-day';

export interface Streak {
  /** Consecutive active study days ending today, or yesterday if today has no activity yet. */
  current: number;
  /** Longest run of consecutive active study days ever. */
  longest: number;
  lastActiveDay: StudyDay | null;
}

/**
 * Derive the streak from the study days that have at least one attempt.
 * Days after `today` (possible after a timezone change) are ignored.
 */
export function computeStreak(activeDays: Iterable<StudyDay>, today: StudyDay): Streak {
  const days = [...new Set(activeDays)].filter((day) => day <= today).sort();
  if (days.length === 0) return { current: 0, longest: 0, lastActiveDay: null };

  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    const previous = days[i - 1] ?? '';
    run = days[i] === addDays(previous, 1) ? run + 1 : 1;
    longest = Math.max(longest, run);
  }

  const lastActiveDay = days[days.length - 1] ?? null;
  const alive = lastActiveDay === today || lastActiveDay === addDays(today, -1);
  return { current: alive ? run : 0, longest, lastActiveDay };
}
