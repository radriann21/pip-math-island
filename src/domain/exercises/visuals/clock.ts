/** An analogue clock face showing h:m. Uses `.clk-f`, `.clk-n` and `.hand` CSS classes. */
export function clock(h: number, m: number): string {
  let body = '<circle class="clk-f" cx="70" cy="70" r="64"/>';
  for (let i = 1; i <= 12; i++) {
    const a = (i * Math.PI) / 6;
    body += `<text class="clk-n" x="${(70 + 50 * Math.sin(a)).toFixed(1)}" y="${(70 - 50 * Math.cos(a)).toFixed(1)}">${i}</text>`;
  }
  for (let i = 0; i < 60; i++) {
    const a = (i * Math.PI) / 30;
    const l = i % 5 ? 3 : 0;
    body += `<line x1="${(70 + (60 - l) * Math.sin(a)).toFixed(1)}" y1="${(70 - (60 - l) * Math.cos(a)).toFixed(1)}" x2="${(70 + 61 * Math.sin(a)).toFixed(1)}" y2="${(70 - 61 * Math.cos(a)).toFixed(1)}" stroke="var(--ink)" stroke-width="${i % 5 ? 1 : 0}"/>`;
  }
  const hourAngle = (((h % 12) + m / 60) * Math.PI) / 6;
  const minuteAngle = (m * Math.PI) / 30;
  body += `<line class="hand" stroke-width="7" x1="70" y1="70" x2="${(70 + 32 * Math.sin(hourAngle)).toFixed(1)}" y2="${(70 - 32 * Math.cos(hourAngle)).toFixed(1)}"/>`;
  body += `<line class="hand m" stroke-width="4" x1="70" y1="70" x2="${(70 + 48 * Math.sin(minuteAngle)).toFixed(1)}" y2="${(70 - 48 * Math.cos(minuteAngle)).toFixed(1)}"/><circle cx="70" cy="70" r="5" fill="var(--ink)"/>`;
  return `<svg viewBox="0 0 140 140" width="190" height="190" role="img" aria-label="${h}:${String(m).padStart(2, '0')}">${body}</svg>`;
}
