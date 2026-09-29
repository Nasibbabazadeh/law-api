import { addDays, type StudyDay } from '../time/study-day';

/**
 * Days until the next review at each ladder step. A wrong answer puts a question on
 * step 0 (due tomorrow); each correct review moves it up one step; a correct answer
 * on the last step (the 30-day review) masters it and it leaves the queue.
 *
 *   wrong → +1 → correct → +3 → correct → +7 → correct → +30 → correct → mastered
 */
export const LADDER_INTERVALS = [1, 3, 7, 30] as const;
export const LAST_STEP = LADDER_INTERVALS.length - 1;

export interface ReviewState {
  /** 0..LAST_STEP. */
  step: number;
  /** Correct ladder answers in a row since the last wrong answer. */
  correctStreak: number;
  /** First study day the question is due again. */
  dueDay: StudyDay;
  /** ISO instant of the answer that mastered it, or null while in the queue. */
  masteredAt: string | null;
  wrongCount: number;
  /** Study day of the last answer that reached the ladder. */
  lastAttemptDay: StudyDay;
}

export interface LadderAnswer {
  isCorrect: boolean;
  studyDay: StudyDay;
  /** ISO instant. */
  answeredAt: string;
}

function intervalAt(step: number): number {
  return LADDER_INTERVALS[Math.min(Math.max(step, 0), LAST_STEP)] ?? 1;
}

/**
 * Apply one answer to a question's review state. The caller decides which answers
 * reach the ladder (see `deriveReviewItems`: first answer per study day only).
 *
 * - Wrong, from any state: back to step 0, due the next day.
 * - Correct with no state: nothing to review (returns null).
 * - Correct after mastery: stays mastered.
 * - Correct before the due day: logged elsewhere, but the ladder does not move.
 * - Correct on or after the due day: up one step, or mastered on the last step.
 */
export function applyAnswer(state: ReviewState | null, answer: LadderAnswer): ReviewState | null {
  const day = answer.studyDay;

  if (!answer.isCorrect) {
    return {
      step: 0,
      correctStreak: 0,
      dueDay: addDays(day, intervalAt(0)),
      masteredAt: null,
      wrongCount: (state?.wrongCount ?? 0) + 1,
      lastAttemptDay: day,
    };
  }

  if (state === null) return null;

  if (state.masteredAt !== null || day < state.dueDay) {
    return { ...state, lastAttemptDay: day };
  }

  if (state.step >= LAST_STEP) {
    return {
      ...state,
      correctStreak: state.correctStreak + 1,
      masteredAt: answer.answeredAt,
      lastAttemptDay: day,
    };
  }

  const step = state.step + 1;
  return {
    ...state,
    step,
    correctStreak: state.correctStreak + 1,
    dueDay: addDays(day, intervalAt(step)),
    lastAttemptDay: day,
  };
}

/** The fields queue checks need; `masteredAt` may be an ISO string or a Date (from a DB row). */
export interface QueueEntry {
  masteredAt: string | Date | null;
  dueDay: StudyDay;
}

/** A question is in the review queue while it is not mastered. */
export function isInQueue(state: Pick<QueueEntry, 'masteredAt'>): boolean {
  return state.masteredAt === null;
}

/** Due on `today` (or overdue). */
export function isDue(state: QueueEntry, today: StudyDay): boolean {
  return isInQueue(state) && state.dueDay <= today;
}
