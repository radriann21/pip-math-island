export interface ItemsOptions {
  /** Items per row (default 5). */
  per?: number;
  /** Cell size in px (default 30). */
  sz?: number;
  /** Cross out the last N items. */
  cross?: number;
}

/** A grid of `n` sprite icons (`#i-<symbol>`), optionally crossing out the last ones. */
export function items(n: number, symbol: string, options: ItemsOptions = {}): string {
  const per = options.per ?? 5;
  const sz = options.sz ?? 30;
  const rows = Math.ceil(n / per);
  const w = Math.min(n, per) * sz;
  const h = rows * sz;
  let body = '';
  for (let i = 0; i < n; i++) {
    const x = (i % per) * sz;
    const y = Math.floor(i / per) * sz;
    body += `<use href="#i-${symbol}" x="${x}" y="${y}" width="${sz - 2}" height="${sz - 2}"/>`;
    if (options.cross && i >= n - options.cross) {
      body += `<path class="xx" d="M${x + 4} ${y + 4}L${x + sz - 6} ${y + sz - 6}M${x + sz - 6} ${y + 4}L${x + 4} ${y + sz - 6}"/>`;
    }
  }
  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${n}">${body}</svg>`;
}

/** A rows x cols array of dots (multiplication arrays). */
export function dotsArray(rows: number, cols: number): string {
  let body = '';
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      body += `<circle class="dot-v" cx="${14 + j * 26}" cy="${14 + i * 26}" r="10"/>`;
    }
  }
  return `<svg viewBox="0 0 ${cols * 26} ${rows * 26}" width="${cols * 26}" height="${rows * 26}" role="img" aria-label="${rows} x ${cols}">${body}</svg>`;
}

/** `k` empty plates side by side (sharing / division). */
export function plates(k: number): string {
  let body = '';
  for (let i = 0; i < k; i++) body += `<circle class="plate" cx="${30 + i * 66}" cy="30" r="26"/>`;
  return `<svg viewBox="0 0 ${k * 66} 60" width="${k * 66}" height="60" role="img" aria-label="${k}">${body}</svg>`;
}
