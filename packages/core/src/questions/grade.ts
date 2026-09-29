import type { QuestionOption, QuestionType } from '../schemas/enums';

export interface GradableQuestion {
  type: QuestionType;
  options: readonly QuestionOption[];
  correctAnswer: string;
}

export type GradeResult = { valid: true; isCorrect: boolean } | { valid: false; reason: string };

export const TRUE_FALSE_KEYS = ['true', 'false'] as const;

/**
 * Grade a submitted answer. The server always grades; a client-sent correctness flag
 * is never trusted. An answer that is not one of the question's options is invalid.
 */
export function gradeAnswer(question: GradableQuestion, answer: string): GradeResult {
  const submitted = answer.trim();
  if (question.type === 'true_false') {
    const normalized = submitted.toLowerCase();
    if (normalized !== 'true' && normalized !== 'false') {
      return { valid: false, reason: 'answer must be "true" or "false"' };
    }
    return { valid: true, isCorrect: normalized === question.correctAnswer.toLowerCase() };
  }
  if (!question.options.some((option) => option.key === submitted)) {
    return { valid: false, reason: `answer "${submitted}" is not an option key` };
  }
  return { valid: true, isCorrect: submitted === question.correctAnswer };
}
