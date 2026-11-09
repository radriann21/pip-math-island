/** Coins (values below 20) and bills (20 and above) in a row. Uses `.coin`, `.coin-t`, `.bill`, `.bill-t`. */
export function coins(values: readonly number[]): string {
  let body = '';
  let x = 4;
  for (const v of values) {
    if (v >= 20) {
      body += `<rect class="bill" x="${x}" y="8" width="84" height="48" rx="6"/><text class="bill-t" x="${x + 42}" y="32">${v}</text>`;
      x += 92;
    } else {
      const fill = v >= 10 ? '#ffd35c' : v >= 5 ? '#e8b94a' : '#f1c96b';
      const radius = v >= 10 ? 25 : v >= 5 ? 22 : 19;
      body += `<circle class="coin" cx="${x + 25}" cy="32" r="${radius}" fill="${fill}" stroke="#a9780f"/><text class="coin-t" x="${x + 25}" y="32">${v}</text>`;
      x += 56;
    }
  }
  return `<svg viewBox="0 0 ${x} 64" width="${x}" height="64" role="img" aria-label="coins">${body}</svg>`;
}
