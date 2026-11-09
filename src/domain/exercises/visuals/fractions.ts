const FILLED = 'var(--violet)';
const EMPTY = 'var(--card)';

/** A circle split into `d` equal wedges with the first `n` filled. */
export function pie(n: number, d: number): string {
  const c = 60;
  let body = '';
  if (d === 1) {
    body = `<circle cx="60" cy="60" r="54" style="fill:${n ? FILLED : EMPTY}" stroke="var(--ink)" stroke-width="3"/>`;
  } else {
    for (let k = 0; k < d; k++) {
      const a0 = -Math.PI / 2 + (k * 2 * Math.PI) / d;
      const a1 = -Math.PI / 2 + ((k + 1) * 2 * Math.PI) / d;
      const x0 = c + 54 * Math.cos(a0);
      const y0 = c + 54 * Math.sin(a0);
      const x1 = c + 54 * Math.cos(a1);
      const y1 = c + 54 * Math.sin(a1);
      body += `<path d="M60 60L${x0.toFixed(2)} ${y0.toFixed(2)}A54 54 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}Z" style="fill:${k < n ? FILLED : EMPTY}" stroke="var(--ink)" stroke-width="3" stroke-linejoin="round"/>`;
    }
  }
  return `<svg viewBox="0 0 120 120" width="120" height="120" role="img" aria-label="${n}/${d}">${body}</svg>`;
}

/** A bar split into `d` equal cells with the first `n` filled. */
export function bar(n: number, d: number): string {
  let body = '';
  const w = 220 / d;
  for (let k = 0; k < d; k++) {
    body += `<rect x="${k * w}" y="2" width="${w}" height="34" style="fill:${k < n ? FILLED : EMPTY}" stroke="var(--ink)" stroke-width="3"/>`;
  }
  return `<svg viewBox="-4 0 232 40" width="232" height="40" role="img" aria-label="${n}/${d}">${body}</svg>`;
}
