import { describe, expect, it } from 'vitest';
import { computeStats, computeStreak, upcomingCounts, dueToday } from '../src';

describe('computeStreak', () => {
  it('is zero with no activity', () => {
    expect(computeStreak([], '2026-09-10')).toEqual({
      current: 0,
      longest: 0,
      lastActiveDay: null,
    });
  });

  it('counts consecutive days ending today', () => {
    expect(computeStreak(['2026-09-08', '2026-09-09', '2026-09-10'], '2026-09-10')).toMatchObject({
      current: 3,
      longest: 3,
    });
  });

  it('stays alive until the end of the day after the last activity', () => {
    expect(computeStreak(['2026-09-08', '2026-09-09'], '2026-09-10').current).toBe(2);
    expect(computeStreak(['2026-09-08', '2026-09-09'], '2026-09-11').current).toBe(0);
  });

  it('breaks on a gap and remembers the record', () => {
    const days = [
      '2026-09-01',
      '2026-09-02',
      '2026-09-03',
      '2026-09-04',
      '2026-09-08',
      '2026-09-09',
    ];
    expect(computeStreak(days, '2026-09-09')).toEqual({
      current: 2,
      longest: 4,
      lastActiveDay: '2026-09-09',
    });
  });

  it('ignores duplicate days, order and days after today', () => {
    expect(
      computeStreak(['2026-09-10', '2026-09-09', '2026-09-10', '2026-09-11'], '2026-09-10'),
    ).toMatchObject({ current: 2, lastActiveDay: '2026-09-10' });
  });

  it('works across a month boundary', () => {
    expect(computeStreak(['2026-08-31', '2026-09-01'], '2026-09-01').current).toBe(2);
  });
});

describe('computeStats', () => {
  it('counts every attempt, including repeats on the same day', () => {
    const stats = computeStats([
      { questionId: 'q1', topicId: 't1', fieldId: 'f1', isCorrect: false, studyDay: '2026-09-01' },
      { questionId: 'q1', topicId: 't1', fieldId: 'f1', isCorrect: true, studyDay: '2026-09-01' },
      { questionId: 'q2', topicId: 't1', fieldId: 'f1', isCorrect: true, studyDay: '2026-09-02' },
      { questionId: 'q3', topicId: 't2', fieldId: 'f2', isCorrect: true, studyDay: '2026-09-02' },
    ]);
    expect(stats).toEqual({
      totalAttempts: 4,
      correctAttempts: 3,
      accuracy: 75,
      questionsAnswered: 3,
      topicsPracticed: 2,
      activeDays: 2,
      perField: [
        { fieldId: 'f1', attempts: 3, correct: 2, accuracy: 67 },
        { fieldId: 'f2', attempts: 1, correct: 1, accuracy: 100 },
      ],
    });
  });

  it('is all zeros with no attempts', () => {
    expect(computeStats([])).toMatchObject({ totalAttempts: 0, accuracy: 0, perField: [] });
  });
});

describe('queue helpers', () => {
  const items = [
    { id: 'a', dueDay: '2026-09-09', masteredAt: null },
    { id: 'b', dueDay: '2026-09-10', masteredAt: null },
    { id: 'c', dueDay: '2026-09-11', masteredAt: null },
    { id: 'd', dueDay: '2026-09-11', masteredAt: null },
    { id: 'e', dueDay: '2026-09-17', masteredAt: null },
    { id: 'f', dueDay: '2026-09-18', masteredAt: null },
    { id: 'g', dueDay: '2026-09-08', masteredAt: '2026-09-08T10:00:00Z' },
  ];

  it('dueToday includes overdue items and skips mastered ones', () => {
    expect(dueToday(items, '2026-09-10').map((i) => i.id)).toEqual(['a', 'b']);
  });

  it('upcomingCounts covers the next 7 days, tomorrow first', () => {
    expect(upcomingCounts(items, '2026-09-10')).toEqual([
      { day: '2026-09-11', count: 2 },
      { day: '2026-09-12', count: 0 },
      { day: '2026-09-13', count: 0 },
      { day: '2026-09-14', count: 0 },
      { day: '2026-09-15', count: 0 },
      { day: '2026-09-16', count: 0 },
      { day: '2026-09-17', count: 1 },
    ]);
  });
});
