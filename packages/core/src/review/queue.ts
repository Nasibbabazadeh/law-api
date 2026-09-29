import { addDays, type StudyDay } from '../time/study-day';
import { isDue, isInQueue, type ReviewState } from './ladder';

export interface UpcomingCount {
  day: StudyDay;
  count: number;
}

/** Items due today or overdue. */
export function dueToday<T extends Pick<ReviewState, 'masteredAt' | 'dueDay'>>(
  items: readonly T[],
  today: StudyDay,
): T[] {
  return items.filter((item) => isDue(item, today));
}

/** Number of queued items falling due on each of the next `horizon` days (tomorrow first). */
export function upcomingCounts(
  items: readonly Pick<ReviewState, 'masteredAt' | 'dueDay'>[],
  today: StudyDay,
  horizon = 7,
): UpcomingCount[] {
  const days = Array.from({ length: horizon }, (_, i) => addDays(today, i + 1));
  const counts = new Map<StudyDay, number>(days.map((day) => [day, 0]));
  for (const item of items) {
    if (!isInQueue(item)) continue;
    const count = counts.get(item.dueDay);
    if (count !== undefined) counts.set(item.dueDay, count + 1);
  }
  return days.map((day) => ({ day, count: counts.get(day) ?? 0 }));
}
