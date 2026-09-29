/**
 * Azerbaijani-aware text helpers. JavaScript's default case mapping is wrong for
 * the dotted/dotless i pairs (I ↔ ı, İ ↔ i), and `Intl.Collator('az')` is not
 * available on every React Native engine, so these do not depend on locale data.
 */

/** The 32-letter Azerbaijani Latin alphabet in order. */
export const AZ_ALPHABET = [
  'a', 'b', 'c', 'ç', 'd', 'e', 'ə', 'f', 'g', 'ğ', 'h', 'x', 'ı', 'i', 'j', 'k',
  'q', 'l', 'm', 'n', 'o', 'ö', 'p', 'r', 's', 'ş', 't', 'u', 'ü', 'v', 'y', 'z',
] as const; // prettier-ignore

const LETTER_RANK = new Map<string, number>(AZ_ALPHABET.map((letter, index) => [letter, index]));
const LETTER_RANK_BASE = 0x10000; // above every BMP code point used for non-letters
const FOREIGN_LETTER_BASE = LETTER_RANK_BASE * 2;
const IS_LETTER = /\p{L}/u;

export function azLower(text: string): string {
  return text.replace(/I/g, 'ı').replace(/İ/g, 'i').toLowerCase();
}

export function azUpper(text: string): string {
  return text.replace(/i/g, 'İ').replace(/ı/g, 'I').toUpperCase();
}

function rank(char: string): number {
  const letterRank = LETTER_RANK.get(char);
  if (letterRank !== undefined) return LETTER_RANK_BASE + letterRank;
  const codePoint = char.codePointAt(0) ?? 0;
  // Letters outside the alphabet (w, é, ...) sort after it; spaces, digits and
  // punctuation sort before letters.
  return IS_LETTER.test(char) ? FOREIGN_LETTER_BASE + codePoint : codePoint;
}

/**
 * Compare two strings in Azerbaijani alphabetical order (A B C Ç D E Ə F G Ğ H X I İ J K Q ...).
 * Case-insensitive first; ties are broken by code point so the order is total.
 * Usable directly as an `Array.prototype.sort` comparator.
 */
export function azCompare(a: string, b: string): number {
  const left = Array.from(azLower(a));
  const right = Array.from(azLower(b));
  const length = Math.min(left.length, right.length);
  for (let i = 0; i < length; i++) {
    const diff = rank(left[i] ?? '') - rank(right[i] ?? '');
    if (diff !== 0) return diff < 0 ? -1 : 1;
  }
  if (left.length !== right.length) return left.length < right.length ? -1 : 1;
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/** Case-insensitive (Azerbaijani rules) substring match. */
export function azIncludes(haystack: string, needle: string): boolean {
  return azLower(haystack).includes(azLower(needle));
}
