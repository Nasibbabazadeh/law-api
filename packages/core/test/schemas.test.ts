import { describe, expect, it } from 'vitest';
import {
  AttemptInputSchema,
  answeredAtProblem,
  MePatchSchema,
  QuestionImportRowSchema,
  csvRecordToImportInput,
  gradeAnswer,
} from '../src';

describe('AttemptInputSchema', () => {
  const valid = {
    id: '0b6f1c1e-3f1a-4a47-9d2e-6f3b9c1d2a10',
    questionId: '5f0c1a2e-7b3d-4c1e-8a9f-000000000001',
    context: 'quiz',
    answer: 'B',
    answeredAt: '2026-09-29T19:59:59.000Z',
    timezone: 'Asia/Baku',
  };

  it('accepts a well-formed attempt', () => {
    expect(AttemptInputSchema.safeParse(valid).success).toBe(true);
    expect(
      AttemptInputSchema.safeParse({ ...valid, answeredAt: '2026-09-29T23:59:59+04:00' }).success,
    ).toBe(true);
  });

  it('rejects unknown timezones, contexts, bad ids and local times without an offset', () => {
    expect(AttemptInputSchema.safeParse({ ...valid, timezone: 'Baku' }).success).toBe(false);
    expect(AttemptInputSchema.safeParse({ ...valid, context: 'game' }).success).toBe(false);
    expect(AttemptInputSchema.safeParse({ ...valid, id: '123' }).success).toBe(false);
    expect(
      AttemptInputSchema.safeParse({ ...valid, answeredAt: '2026-09-29T23:59:59' }).success,
    ).toBe(false);
  });
});

describe('MePatchSchema', () => {
  it('accepts interests and timezone', () => {
    expect(
      MePatchSchema.safeParse({ interests: ['cinayet-huququ'], timezone: 'Asia/Baku' }).success,
    ).toBe(true);
  });

  it('rejects empty patches, unknown keys, duplicates and too many interests', () => {
    expect(MePatchSchema.safeParse({}).success).toBe(false);
    expect(MePatchSchema.safeParse({ role: 'teacher' }).success).toBe(false);
    expect(MePatchSchema.safeParse({ interests: ['a', 'a'] }).success).toBe(false);
    expect(
      MePatchSchema.safeParse({ interests: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] }).success,
    ).toBe(false);
  });
});

describe('QuestionImportRowSchema', () => {
  const base = {
    fieldSlug: 'cinayet-huququ',
    topicSlug: 'cinayet-mesuliyyeti-yasi',
    type: 'single_choice',
    prompt: 'Cinayət məsuliyyətinin ümumi yaşı neçədir?',
    options: [
      { key: 'A', text: '14' },
      { key: 'B', text: '16' },
    ],
    correctAnswer: 'B',
    articles: [{ code: 'CM', number: '20' }],
  };

  it('accepts a single choice row and applies defaults', () => {
    const parsed = QuestionImportRowSchema.parse(base);
    expect(parsed).toMatchObject({ difficulty: 1, explanation: '' });
  });

  it('fills in true/false options and normalizes the answer', () => {
    const parsed = QuestionImportRowSchema.parse({
      ...base,
      type: 'true_false',
      options: undefined,
      correctAnswer: 'TRUE',
    });
    expect(parsed.correctAnswer).toBe('true');
    expect(parsed.options.map((o) => o.key)).toEqual(['true', 'false']);
  });

  it('rejects a correct answer that is not an option, duplicate keys and too few options', () => {
    expect(QuestionImportRowSchema.safeParse({ ...base, correctAnswer: 'C' }).success).toBe(false);
    expect(
      QuestionImportRowSchema.safeParse({
        ...base,
        options: [
          { key: 'A', text: '1' },
          { key: 'A', text: '2' },
        ],
      }).success,
    ).toBe(false);
    expect(
      QuestionImportRowSchema.safeParse({ ...base, options: [{ key: 'A', text: '1' }] }).success,
    ).toBe(false);
  });
});

describe('csvRecordToImportInput', () => {
  it('parses options and article references', () => {
    const input = csvRecordToImportInput({
      id: '',
      fieldSlug: 'cinayet-huququ',
      topicSlug: 'cinayet-mesuliyyeti-yasi',
      type: 'single_choice',
      prompt: 'Sual: hansı yaş?',
      options: 'A:14 yaş|B:16 yaş: ümumi qayda',
      correctAnswer: 'B',
      explanation: '',
      difficulty: '2',
      articles: 'CM:20; CM:20.2@2024-01-01',
    });
    const parsed = QuestionImportRowSchema.parse(input);
    expect(parsed.options).toEqual([
      { key: 'A', text: '14 yaş' },
      { key: 'B', text: '16 yaş: ümumi qayda' },
    ]);
    expect(parsed.articles).toEqual([
      { code: 'CM', number: '20' },
      { code: 'CM', number: '20.2', version: '2024-01-01' },
    ]);
    expect(parsed.difficulty).toBe(2);
    expect(parsed.id).toBeUndefined();
  });
});

describe('gradeAnswer', () => {
  const choice = {
    type: 'single_choice' as const,
    options: [
      { key: 'A', text: '14' },
      { key: 'B', text: '16' },
    ],
    correctAnswer: 'B',
  };
  const trueFalse = { type: 'true_false' as const, options: [], correctAnswer: 'false' };

  it('grades option keys', () => {
    expect(gradeAnswer(choice, 'B')).toEqual({ valid: true, isCorrect: true });
    expect(gradeAnswer(choice, 'A')).toEqual({ valid: true, isCorrect: false });
    expect(gradeAnswer(choice, 'Z').valid).toBe(false);
  });

  it('grades true/false case-insensitively', () => {
    expect(gradeAnswer(trueFalse, 'FALSE')).toEqual({ valid: true, isCorrect: true });
    expect(gradeAnswer(trueFalse, 'true')).toEqual({ valid: true, isCorrect: false });
    expect(gradeAnswer(trueFalse, 'yes').valid).toBe(false);
  });
});

describe('answeredAtProblem', () => {
  const now = new Date('2026-09-29T12:00:00Z');

  it('accepts past answers and small clock skew', () => {
    expect(answeredAtProblem(new Date('2026-09-20T12:00:00Z'), now)).toBeNull();
    expect(answeredAtProblem(new Date('2026-09-29T12:04:00Z'), now)).toBeNull();
  });

  it('rejects answers from the future or before the app existed', () => {
    expect(answeredAtProblem(new Date('2026-09-29T12:06:00Z'), now)).toMatch(/future/);
    expect(answeredAtProblem(new Date('2020-01-01T00:00:00Z'), now)).toMatch(/past/);
  });
});
