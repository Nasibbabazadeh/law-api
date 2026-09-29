import { describe, expect, it } from 'vitest';
import { LADDER_INTERVALS, applyAnswer, isDue, type LadderAnswer, type ReviewState } from '../src';

const answer = (studyDay: string, isCorrect: boolean): LadderAnswer => ({
  isCorrect,
  studyDay,
  answeredAt: `${studyDay}T08:00:00.000Z`,
});

const state = (overrides: Partial<ReviewState>): ReviewState => ({
  step: 0,
  correctStreak: 0,
  dueDay: '2026-09-02',
  masteredAt: null,
  wrongCount: 1,
  lastAttemptDay: '2026-09-01',
  ...overrides,
});

describe('applyAnswer', () => {
  it('uses the 1 → 3 → 7 → 30 day ladder', () => {
    expect(LADDER_INTERVALS).toEqual([1, 3, 7, 30]);
  });

  it('a wrong answer on a new question enters the queue at step 0, due tomorrow', () => {
    expect(applyAnswer(null, answer('2026-09-01', false))).toEqual({
      step: 0,
      correctStreak: 0,
      dueDay: '2026-09-02',
      masteredAt: null,
      wrongCount: 1,
      lastAttemptDay: '2026-09-01',
    });
  });

  it('a correct answer on a question that is not in the queue does nothing', () => {
    expect(applyAnswer(null, answer('2026-09-01', true))).toBeNull();
  });

  it('each correct review moves up one step: +3, +7, +30, then mastered', () => {
    let s = applyAnswer(null, answer('2026-09-01', false));
    expect(s?.dueDay).toBe('2026-09-02');

    s = applyAnswer(s, answer('2026-09-02', true));
    expect(s).toMatchObject({ step: 1, correctStreak: 1, dueDay: '2026-09-05', masteredAt: null });

    s = applyAnswer(s, answer('2026-09-05', true));
    expect(s).toMatchObject({ step: 2, correctStreak: 2, dueDay: '2026-09-12', masteredAt: null });

    s = applyAnswer(s, answer('2026-09-12', true));
    expect(s).toMatchObject({ step: 3, correctStreak: 3, dueDay: '2026-10-12', masteredAt: null });

    s = applyAnswer(s, answer('2026-10-12', true));
    expect(s).toMatchObject({
      step: 3,
      correctStreak: 4,
      masteredAt: '2026-10-12T08:00:00.000Z',
    });
    expect(s && isDue(s, '2030-01-01')).toBe(false);
  });

  it.each([0, 1, 2, 3])('a wrong answer at step %i resets to step 0, due tomorrow', (step) => {
    const next = applyAnswer(
      state({ step, correctStreak: step, dueDay: '2026-09-10', wrongCount: 2 }),
      answer('2026-09-10', false),
    );
    expect(next).toMatchObject({
      step: 0,
      correctStreak: 0,
      dueDay: '2026-09-11',
      wrongCount: 3,
      masteredAt: null,
    });
  });

  it('a correct answer before the due day is logged but does not move the ladder', () => {
    const before = state({ step: 1, correctStreak: 1, dueDay: '2026-09-05' });
    const next = applyAnswer(before, answer('2026-09-03', true));
    expect(next).toEqual({ ...before, lastAttemptDay: '2026-09-03' });
  });

  it('a wrong answer before the due day still resets', () => {
    const next = applyAnswer(
      state({ step: 2, correctStreak: 2, dueDay: '2026-09-12' }),
      answer('2026-09-06', false),
    );
    expect(next).toMatchObject({ step: 0, correctStreak: 0, dueDay: '2026-09-07' });
  });

  it('an overdue review counts, and the next interval starts from the day it was answered', () => {
    const next = applyAnswer(state({ step: 0, dueDay: '2026-09-02' }), answer('2026-09-20', true));
    expect(next).toMatchObject({ step: 1, dueDay: '2026-09-23' });
  });

  it('a mastered question stays mastered on a correct answer', () => {
    const mastered = state({
      step: 3,
      correctStreak: 4,
      masteredAt: '2026-10-12T08:00:00.000Z',
    });
    expect(applyAnswer(mastered, answer('2026-11-01', true))).toMatchObject({
      masteredAt: '2026-10-12T08:00:00.000Z',
      lastAttemptDay: '2026-11-01',
    });
  });

  it('a wrong answer after mastery brings the question back at step 0', () => {
    const mastered = state({ step: 3, correctStreak: 4, masteredAt: '2026-10-12T08:00:00.000Z' });
    expect(applyAnswer(mastered, answer('2026-11-01', false))).toMatchObject({
      step: 0,
      correctStreak: 0,
      dueDay: '2026-11-02',
      masteredAt: null,
      wrongCount: 2,
    });
  });
});

describe('isDue', () => {
  it('is due on and after the due day, never when mastered', () => {
    const s = state({ dueDay: '2026-09-05' });
    expect(isDue(s, '2026-09-04')).toBe(false);
    expect(isDue(s, '2026-09-05')).toBe(true);
    expect(isDue(s, '2026-09-30')).toBe(true);
    expect(isDue({ ...s, masteredAt: '2026-09-05T00:00:00Z' }, '2026-09-30')).toBe(false);
  });
});
