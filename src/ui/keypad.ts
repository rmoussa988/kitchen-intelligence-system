/** Numeric keypad buffer helper (prototype `appendKey`). */
export const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'] as const;

export function appendKey(cur: string, k: string, maxLen = 7): string {
  if (k === '⌫') return cur.slice(0, -1);
  if (k === '.' && cur.includes('.')) return cur;
  if (cur.length >= maxLen) return cur;
  if (k === '.' && !cur) return '0.';
  return cur + k;
}
