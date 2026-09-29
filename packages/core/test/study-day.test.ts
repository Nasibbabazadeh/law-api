import { describe, expect, it } from 'vitest';
import { addDays, diffDays, isStudyDay, isValidTimeZone, studyDay } from '../src';

describe('studyDay', () => {
  // Asia/Baku is UTC+4 all year (no DST since 2016): local midnight is 20:00Z the day before.
  it('rolls over at local midnight in Asia/Baku, not at UTC midnight', () => {
    expect(studyDay('2026-03-14T19:59:59.999Z', 'Asia/Baku')).toBe('2026-03-14');
    expect(studyDay('2026-03-14T20:00:00.000Z', 'Asia/Baku')).toBe('2026-03-15');
    expect(studyDay('2026-03-14T23:30:00.000Z', 'Asia/Baku')).toBe('2026-03-15');
    expect(studyDay('2026-03-14T23:30:00.000Z', 'UTC')).toBe('2026-03-14');
  });

  it('respects the offset in the instant string', () => {
    expect(studyDay('2026-03-15T00:00:00+04:00', 'Asia/Baku')).toBe('2026-03-15');
    expect(studyDay('2026-03-14T23:59:59+04:00', 'Asia/Baku')).toBe('2026-03-14');
  });

  it('handles year boundaries and leap days', () => {
    expect(studyDay('2026-12-31T20:00:00Z', 'Asia/Baku')).toBe('2027-01-01');
    expect(studyDay('2028-02-28T20:30:00Z', 'Asia/Baku')).toBe('2028-02-29');
  });

  it('gives different days for the same instant in different zones', () => {
    const instant = new Date('2026-06-01T02:00:00Z');
    expect(studyDay(instant, 'Asia/Baku')).toBe('2026-06-01');
    expect(studyDay(instant, 'America/New_York')).toBe('2026-05-31');
  });

  it('handles DST zones', () => {
    // Europe/Berlin switches to UTC+2 on 2026-03-29 at 01:00Z.
    expect(studyDay('2026-03-28T22:59:59Z', 'Europe/Berlin')).toBe('2026-03-28');
    expect(studyDay('2026-03-28T23:00:00Z', 'Europe/Berlin')).toBe('2026-03-29');
    expect(studyDay('2026-03-29T21:59:59Z', 'Europe/Berlin')).toBe('2026-03-29');
    expect(studyDay('2026-03-29T22:00:00Z', 'Europe/Berlin')).toBe('2026-03-30');
  });

  it('rejects invalid input', () => {
    expect(() => studyDay('not a date', 'Asia/Baku')).toThrow(RangeError);
    expect(() => studyDay('2026-03-14T20:00:00Z', 'Mars/Olympus')).toThrow(RangeError);
  });
});

describe('isValidTimeZone', () => {
  it('accepts IANA names and rejects junk', () => {
    expect(isValidTimeZone('Asia/Baku')).toBe(true);
    expect(isValidTimeZone('UTC')).toBe(true);
    expect(isValidTimeZone('Europe/Istanbul')).toBe(true);
    expect(isValidTimeZone('')).toBe(false);
    expect(isValidTimeZone('Asia/Nowhere')).toBe(false);
    expect(isValidTimeZone('+04:00')).toBe(false);
  });
});

describe('addDays / diffDays', () => {
  it('does calendar arithmetic across months, years and leap days', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2026-09-29', 30)).toBe('2026-10-29');
    expect(diffDays('2026-09-29', '2026-10-29')).toBe(30);
    expect(diffDays('2026-10-29', '2026-09-29')).toBe(-30);
  });

  it('is unaffected by the host timezone around DST changes', () => {
    expect(addDays('2026-03-28', 1)).toBe('2026-03-29');
    expect(addDays('2026-03-29', 1)).toBe('2026-03-30');
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26');
  });

  it('rejects malformed or impossible days', () => {
    expect(() => addDays('2026-2-1', 1)).toThrow(RangeError);
    expect(() => addDays('2026-02-30', 1)).toThrow(RangeError);
    expect(isStudyDay('2026-02-28')).toBe(true);
    expect(isStudyDay('2026-02-29')).toBe(false);
    expect(isStudyDay('2026-02-28T00:00:00Z')).toBe(false);
  });
});
