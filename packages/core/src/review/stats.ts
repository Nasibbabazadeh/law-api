import type { StudyDay } from '../time/study-day';

export interface StatsAttempt {
  questionId: string;
  topicId: string;
  fieldId: string;
  isCorrect: boolean;
  studyDay: StudyDay;
}

export interface FieldStats {
  fieldId: string;
  attempts: number;
  correct: number;
  /** Whole percent 0..100. */
  accuracy: number;
}

export interface LearningStats {
  totalAttempts: number;
  correctAttempts: number;
  /** Whole percent 0..100 over all attempts (0 when there are none). */
  accuracy: number;
  questionsAnswered: number;
  topicsPracticed: number;
  activeDays: number;
  perField: FieldStats[];
}

export function percent(part: number, total: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}

/** Aggregate stats over every attempt, including repeat attempts on the same day. */
export function computeStats(attempts: readonly StatsAttempt[]): LearningStats {
  const questions = new Set<string>();
  const topics = new Set<string>();
  const days = new Set<StudyDay>();
  const fields = new Map<string, { attempts: number; correct: number }>();
  let correct = 0;

  for (const attempt of attempts) {
    questions.add(attempt.questionId);
    topics.add(attempt.topicId);
    days.add(attempt.studyDay);
    if (attempt.isCorrect) correct++;
    const field = fields.get(attempt.fieldId) ?? { attempts: 0, correct: 0 };
    field.attempts++;
    if (attempt.isCorrect) field.correct++;
    fields.set(attempt.fieldId, field);
  }

  const perField = [...fields.entries()]
    .map(([fieldId, f]) => ({ fieldId, ...f, accuracy: percent(f.correct, f.attempts) }))
    .sort((a, b) => b.attempts - a.attempts || (a.fieldId < b.fieldId ? -1 : 1));

  return {
    totalAttempts: attempts.length,
    correctAttempts: correct,
    accuracy: percent(correct, attempts.length),
    questionsAnswered: questions.size,
    topicsPracticed: topics.size,
    activeDays: days.size,
    perField,
  };
}
