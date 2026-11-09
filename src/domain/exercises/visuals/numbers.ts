import { formatNumber } from '../../shared/locale';
import type { Locale } from '../../shared/types';

/** Base-ten blocks for `n` (< 1000): flats = 100, rods = 10, cubes = 1. Uses `#pgH/#pgT/#pgO` patterns. */
export function baseTenBlocks(n: number): string {
  const hundreds = Math.floor(n / 100);
  const tens = Math.floor(n / 10) % 10;
  const ones = n % 10;
  let body = '';
  let x = 2;
  for (let i = 0; i < hundreds; i++) {
    body += `<rect x="${x}" y="2" width="66" height="66" fill="url(#pgH)" stroke="#2c4fb3" stroke-width="1.5"/>`;
    x += 72;
  }
  for (let i = 0; i < tens; i++) {
    body += `<rect x="${x}" y="2" width="6.6" height="66" fill="url(#pgT)" stroke="#1d7f70" stroke-width="1.2"/>`;
    x += 10;
  }
  if (tens) x += 10;
  for (let i = 0; i < ones; i++) {
    body += `<rect x="${x + (i % 3) * 8}" y="${2 + Math.floor(i / 3) * 8}" width="6.6" height="6.6" fill="url(#pgO)" stroke="#b97500" stroke-width="1"/>`;
  }
  const w = x + (ones ? 26 : 2);
  const width = Math.min(w * 1.4, 560);
  return `<svg viewBox="0 0 ${w} 70" width="${width}" height="${(width * 70) / w}" role="img" aria-label="${n}">${body}</svg>`;
}

/** A row of boxes for number sequences; the box at `hiddenIndex` shows "?". */
export function sequenceBoxes(locale: Locale, values: readonly number[], hiddenIndex: number): string {
  const cells = values
    .map((v, i) => (i === hiddenIndex ? '<b class="q">?</b>' : `<b>${formatNumber(locale, v)}</b>`))
    .join('');
  return `<div class="seq">${cells}</div>`;
}
