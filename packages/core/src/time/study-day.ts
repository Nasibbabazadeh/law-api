/**
 * A study day is a local calendar date (`YYYY-MM-DD`) in the learner's timezone.
 * It is never a UTC timestamp: "today" for a student in Baku starts at 00:00 Baku time.
 */
export type StudyDay = string;

export const STUDY_DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const MS_PER_DAY = 86_400_000;
const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    // Throws RangeError for an unknown timezone.
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

/** True when `timeZone` is an IANA name this runtime understands (e.g. `Asia/Baku`, `UTC`). */
export function isValidTimeZone(timeZone: string): boolean {
  // Newer engines also accept raw offsets such as "+04:00"; only IANA names are allowed.
  if (!/^[A-Za-z]/.test(timeZone)) return false;
  try {
    formatterFor(timeZone);
    return true;
  } catch {
    return false;
  }
}

/**
 * The local calendar date of `instant` in `timeZone`.
 * @throws RangeError when the instant is invalid or the timezone is unknown.
 */
export function studyDay(instant: Date | string | number, timeZone: string): StudyDay {
  const date = instant instanceof Date ? instant : new Date(instant);
  if (Number.isNaN(date.getTime())) {
    throw new RangeError(`Invalid instant: ${String(instant)}`);
  }
  let year = '';
  let month = '';
  let day = '';
  for (const part of formatterFor(timeZone).formatToParts(date)) {
    if (part.type === 'year') year = part.value;
    else if (part.type === 'month') month = part.value;
    else if (part.type === 'day') day = part.value;
  }
  return `${year}-${month}-${day}`;
}

function parseDay(day: StudyDay): number {
  if (!STUDY_DAY_PATTERN.test(day)) {
    throw new RangeError(`Invalid study day: ${day}`);
  }
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  const ms = Date.UTC(y, m - 1, d);
  // Reject impossible dates such as 2026-02-30.
  if (formatUtcDay(ms) !== day) {
    throw new RangeError(`Invalid study day: ${day}`);
  }
  return ms;
}

function formatUtcDay(ms: number): StudyDay {
  return new Date(ms).toISOString().slice(0, 10);
}

/** `day` shifted by `days` calendar days (negative moves back). Pure date arithmetic, no timezone. */
export function addDays(day: StudyDay, days: number): StudyDay {
  return formatUtcDay(parseDay(day) + days * MS_PER_DAY);
}

/** Whole calendar days from `from` to `to` (`to - from`). */
export function diffDays(from: StudyDay, to: StudyDay): number {
  return Math.round((parseDay(to) - parseDay(from)) / MS_PER_DAY);
}

/** True for a well-formed, real calendar date string. */
export function isStudyDay(value: string): value is StudyDay {
  try {
    parseDay(value);
    return true;
  } catch {
    return false;
  }
}
