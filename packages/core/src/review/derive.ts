import type { StudyDay } from '../time/study-day';
import { applyAnswer, type ReviewState } from './ladder';

export interface ReviewAttempt {
  id: string;
  questionId: string;
  isCorrect: boolean;
  /** ISO instant or Date. */
  answeredAt: string | Date;
  studyDay: StudyDay;
}

export interface DerivedReviewItem extends ReviewState {
  questionId: string;
}

function toIso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function byAnswerTime(a: ReviewAttempt, b: ReviewAttempt): number {
  const diff = new Date(a.answeredAt).getTime() - new Date(b.answeredAt).getTime();
  if (diff !== 0) return diff;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Rebuild review state from a user's attempt log. The result is a pure function of
 * the attempts, so it can be recomputed any time (late offline uploads included).
 *
 * Only the first attempt per question per study day moves the ladder. Attempts are
 * replayed in `answeredAt` order; an attempt whose study day is not after the last
 * ladder day for that question (same day, or an earlier local day after a timezone
 * change) is ignored by the ladder. All attempts still count for stats elsewhere.
 *
 * Questions that were never answered wrongly have no review item and are omitted.
 * Mastered items are returned with `masteredAt` set so their history is kept.
 */
export function deriveReviewItems(attempts: readonly ReviewAttempt[]): DerivedReviewItem[] {
  const byQuestion = new Map<string, ReviewAttempt[]>();
  for (const attempt of attempts) {
    const list = byQuestion.get(attempt.questionId);
    if (list) list.push(attempt);
    else byQuestion.set(attempt.questionId, [attempt]);
  }

  const items: DerivedReviewItem[] = [];
  for (const [questionId, list] of byQuestion) {
    list.sort(byAnswerTime);
    let state: ReviewState | null = null;
    let lastLadderDay: StudyDay | null = null;
    for (const attempt of list) {
      if (lastLadderDay !== null && attempt.studyDay <= lastLadderDay) continue;
      lastLadderDay = attempt.studyDay;
      state = applyAnswer(state, {
        isCorrect: attempt.isCorrect,
        studyDay: attempt.studyDay,
        answeredAt: toIso(attempt.answeredAt),
      });
    }
    if (state) items.push({ questionId, ...state });
  }

  items.sort((a, b) => (a.questionId < b.questionId ? -1 : a.questionId > b.questionId ? 1 : 0));
  return items;
}
