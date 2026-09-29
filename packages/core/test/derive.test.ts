import { describe, expect, it } from 'vitest';
import { deriveReviewItems, studyDay, type ReviewAttempt } from '../src';

const Q1 = '11111111-1111-4111-8111-111111111111';
const Q2 = '22222222-2222-4222-8222-222222222222';
let seq = 0;

/** An attempt answered at `instant` in `tz`, with the study day computed like the server does. */
function attempt(
  instant: string,
  isCorrect: boolean,
  opts: { questionId?: string; tz?: string } = {},
): ReviewAttempt {
  const tz = opts.tz ?? 'Asia/Baku';
  seq++;
  return {
    id: `00000000-0000-4000-8000-${String(seq).padStart(12, '0')}`,
    questionId: opts.questionId ?? Q1,
    isCorrect,
    answeredAt: instant,
    studyDay: studyDay(instant, tz),
  };
}

describe('deriveReviewItems', () => {
  it('returns nothing for questions that were only answered correctly', () => {
    expect(
      deriveReviewItems([
        attempt('2026-09-01T08:00:00Z', true),
        attempt('2026-09-02T08:00:00Z', true, { questionId: Q2 }),
      ]),
    ).toEqual([]);
  });

  it('adds a question to the queue on a wrong answer from any context', () => {
    const [item] = deriveReviewItems([attempt('2026-09-01T08:00:00Z', false)]);
    expect(item).toMatchObject({ questionId: Q1, step: 0, dueDay: '2026-09-02', wrongCount: 1 });
  });

  it('walks the full ladder to mastery (4 correct reviews)', () => {
    const items = deriveReviewItems([
      attempt('2026-09-01T08:00:00Z', false),
      attempt('2026-09-02T08:00:00Z', true), // → +3
      attempt('2026-09-05T08:00:00Z', true), // → +7
      attempt('2026-09-12T08:00:00Z', true), // → +30
      attempt('2026-10-12T08:00:00Z', true), // → mastered
    ]);
    expect(items).toEqual([
      {
        questionId: Q1,
        step: 3,
        correctStreak: 4,
        dueDay: '2026-10-12',
        masteredAt: '2026-10-12T08:00:00.000Z',
        wrongCount: 1,
        lastAttemptDay: '2026-10-12',
      },
    ]);
  });

  describe('same-day rule: only the first attempt per question per study day moves the ladder', () => {
    it('a correct retry on the same day as the wrong answer does not advance', () => {
      const [item] = deriveReviewItems([
        attempt('2026-09-01T08:00:00Z', false),
        attempt('2026-09-01T08:05:00Z', true),
        attempt('2026-09-01T15:00:00Z', true),
      ]);
      expect(item).toMatchObject({ step: 0, correctStreak: 0, dueDay: '2026-09-02' });
    });

    it('a wrong answer later on the same day does not reset a correct review', () => {
      const [item] = deriveReviewItems([
        attempt('2026-09-01T08:00:00Z', false),
        attempt('2026-09-02T08:00:00Z', true),
        attempt('2026-09-02T09:00:00Z', false),
      ]);
      expect(item).toMatchObject({ step: 1, dueDay: '2026-09-05', wrongCount: 1 });
    });

    it('an early correct answer uses up the day: a later wrong answer that day is ignored', () => {
      const [item] = deriveReviewItems([
        attempt('2026-09-01T08:00:00Z', false),
        attempt('2026-09-02T08:00:00Z', true), // step 1, due 09-05
        attempt('2026-09-03T08:00:00Z', true), // early, no move
        attempt('2026-09-03T09:00:00Z', false), // same day, ignored
      ]);
      expect(item).toMatchObject({ step: 1, dueDay: '2026-09-05', lastAttemptDay: '2026-09-03' });
    });

    it('the order of arrival does not matter, only answeredAt', () => {
      const wrong = attempt('2026-09-01T08:00:00Z', false);
      const right = attempt('2026-09-01T08:05:00Z', true);
      expect(deriveReviewItems([right, wrong])).toEqual(deriveReviewItems([wrong, right]));
    });
  });

  describe('Asia/Baku midnight edges', () => {
    it('19:59Z and 20:00Z are different study days, so both answers count', () => {
      const [item] = deriveReviewItems([
        attempt('2026-09-01T19:59:00Z', false), // 23:59 Baku, 09-01
        attempt('2026-09-01T20:00:00Z', true), // 00:00 Baku, 09-02 → due day reached
      ]);
      expect(item).toMatchObject({ step: 1, correctStreak: 1, dueDay: '2026-09-05' });
    });

    it('two answers on either side of UTC midnight are the same Baku day', () => {
      const [item] = deriveReviewItems([
        attempt('2026-09-01T21:00:00Z', false), // 01:00 Baku, 09-02
        attempt('2026-09-02T01:00:00Z', true), // 05:00 Baku, 09-02
      ]);
      expect(item).toMatchObject({ step: 0, dueDay: '2026-09-03' });
    });

    it('an answer just before local midnight on the due day still counts as on time', () => {
      const [item] = deriveReviewItems([
        attempt('2026-09-01T08:00:00Z', false),
        attempt('2026-09-02T19:59:59Z', true), // 23:59:59 Baku on the due day
      ]);
      expect(item).toMatchObject({ step: 1, dueDay: '2026-09-05' });
    });
  });

  it('a timezone change that moves the local date backwards does not replay the ladder', () => {
    const [item] = deriveReviewItems([
      attempt('2026-09-01T08:00:00Z', false), // Baku 09-01
      attempt('2026-09-02T08:00:00Z', true), // Baku 09-02 → step 1
      // Flew to New York: 2026-09-02T20:00Z is still 09-02 there (not after the last ladder day).
      attempt('2026-09-02T20:00:00Z', false, { tz: 'America/New_York' }),
    ]);
    expect(item).toMatchObject({ step: 1, dueDay: '2026-09-05' });
  });

  it('handles multiple questions independently', () => {
    const items = deriveReviewItems([
      attempt('2026-09-01T08:00:00Z', false, { questionId: Q2 }),
      attempt('2026-09-01T08:00:00Z', false, { questionId: Q1 }),
      attempt('2026-09-02T08:00:00Z', true, { questionId: Q1 }),
    ]);
    expect(items.map((i) => [i.questionId, i.step])).toEqual([
      [Q1, 1],
      [Q2, 0],
    ]);
  });

  it('keeps wrongCount across resets and re-entry after mastery', () => {
    const [item] = deriveReviewItems([
      attempt('2026-09-01T08:00:00Z', false),
      attempt('2026-09-02T08:00:00Z', true),
      attempt('2026-09-05T08:00:00Z', false),
      attempt('2026-09-06T08:00:00Z', true),
      attempt('2026-09-09T08:00:00Z', true),
      attempt('2026-09-16T08:00:00Z', true),
      attempt('2026-10-16T08:00:00Z', true), // mastered
      attempt('2026-12-01T08:00:00Z', false), // back in the queue
    ]);
    expect(item).toMatchObject({
      step: 0,
      masteredAt: null,
      dueDay: '2026-12-02',
      wrongCount: 3,
    });
  });
});
