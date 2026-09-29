import { describe, expect, it } from 'vitest';
import { AZ_ALPHABET, azCompare, azIncludes, azLower, azUpper } from '../src';

describe('azLower / azUpper', () => {
  it('maps the dotted and dotless i pairs correctly', () => {
    expect(azLower('I')).toBe('ı');
    expect(azLower('İ')).toBe('i');
    expect(azUpper('i')).toBe('İ');
    expect(azUpper('ı')).toBe('I');
  });

  it('handles whole words', () => {
    expect(azLower('İNZİBATİ HÜQUQ')).toBe('inzibati hüquq');
    expect(azLower('IŞIQ')).toBe('ışıq');
    expect(azUpper('cinayət işi')).toBe('CİNAYƏT İŞİ');
    expect(azUpper('qısa')).toBe('QISA');
  });

  it('avoids the combining dot JavaScript adds for İ', () => {
    expect('İ'.toLowerCase()).not.toBe('i');
    expect(azLower('İ')).toHaveLength(1);
  });

  it('round-trips', () => {
    for (const word of ['İlham', 'Işıq', 'ölkə', 'ŞƏHƏR', 'Gənc']) {
      expect(azLower(azUpper(word))).toBe(azLower(word));
    }
  });
});

describe('azCompare', () => {
  it('sorts letters in Azerbaijani alphabet order', () => {
    const shuffled = [...AZ_ALPHABET].reverse();
    expect(shuffled.sort(azCompare)).toEqual([...AZ_ALPHABET]);
  });

  it('sorts field names like the glossary expects', () => {
    const names = [
      'İnzibati hüquq',
      'Konstitusiya hüququ',
      'Xarici',
      'Əmək hüququ',
      'Cinayət hüququ',
      'Çek',
      'Iqtisadi',
      'Hüquq',
      'Ailə hüququ',
      'Mülki hüquq',
    ];
    expect(names.sort(azCompare)).toEqual([
      'Ailə hüququ',
      'Cinayət hüququ',
      'Çek',
      'Əmək hüququ',
      'Hüquq',
      'Xarici',
      'Iqtisadi',
      'İnzibati hüquq',
      'Konstitusiya hüququ',
      'Mülki hüquq',
    ]);
  });

  it('is case-insensitive first, then deterministic', () => {
    expect(azCompare('ışıq', 'IŞIQ')).not.toBe(0);
    expect(Math.sign(azCompare('ışıq', 'İşıq'))).toBe(-1); // ı before i
    expect(azCompare('abc', 'abc')).toBe(0);
    expect(azCompare('ab', 'abc')).toBe(-1);
  });

  it('puts spaces and digits before letters', () => {
    expect(['ab', 'a b', 'a1'].sort(azCompare)).toEqual(['a b', 'a1', 'ab']);
  });
});

describe('azIncludes', () => {
  it('matches regardless of case with Azerbaijani rules', () => {
    expect(azIncludes('İnzibati Xətalar Məcəlləsi', 'inzibati')).toBe(true);
    expect(azIncludes('IŞIQ', 'ışıq')).toBe(true);
    expect(azIncludes('IŞIQ', 'işiq')).toBe(false);
  });
});
