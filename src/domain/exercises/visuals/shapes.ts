import { t } from '../../shared/locale';
import type { Locale } from '../../shared/types';

export type ShapeKey = 'circle' | 'square' | 'triangle' | 'rectangle' | 'pentagon' | 'hexagon' | 'octagon';

export interface ShapeInfo {
  key: ShapeKey;
  en: string;
  es: string;
  /** Number of sides (0 for the circle). */
  sides: number;
}

export const SHAPES: readonly ShapeInfo[] = [
  { key: 'circle', en: 'circle', es: 'círculo', sides: 0 },
  { key: 'square', en: 'square', es: 'cuadrado', sides: 4 },
  { key: 'triangle', en: 'triangle', es: 'triángulo', sides: 3 },
  { key: 'rectangle', en: 'rectangle', es: 'rectángulo', sides: 4 },
  { key: 'pentagon', en: 'pentagon', es: 'pentágono', sides: 5 },
  { key: 'hexagon', en: 'hexagon', es: 'hexágono', sides: 6 },
  { key: 'octagon', en: 'octagon', es: 'octágono', sides: 8 },
];

/** A regular polygon with `n` sides, rotated by `rotation` radians. Uses the `.shape` CSS class. */
export function polygon(n: number, rotation: number, size = 60): string {
  const points: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = rotation + (i * 2 * Math.PI) / n;
    points.push(`${(70 + size * Math.cos(a)).toFixed(1)},${(70 + size * Math.sin(a)).toFixed(1)}`);
  }
  return `<svg viewBox="0 0 140 140" width="140" height="140" role="img"><polygon class="shape" points="${points.join(' ')}"/></svg>`;
}

/** A rectangle with side labels, optionally with a unit-square grid (area counting). */
export function rectangle(
  w: number,
  h: number,
  widthLabel: string | number,
  heightLabel: string | number,
  grid: boolean,
): string {
  const s = grid ? 26 : Math.min(190 / w, 110 / h);
  const W = w * s;
  const H = h * s;
  let lines = '';
  if (grid) {
    for (let i = 1; i < w; i++) {
      lines += `<line x1="${i * s}" y1="0" x2="${i * s}" y2="${H}" stroke="var(--violet)" stroke-opacity=".5"/>`;
    }
    for (let j = 1; j < h; j++) {
      lines += `<line x1="0" y1="${j * s}" x2="${W}" y2="${j * s}" stroke="var(--violet)" stroke-opacity=".5"/>`;
    }
  }
  return `<svg viewBox="-30 -26 ${W + 60} ${H + 54}" width="${W + 60}" height="${H + 54}" role="img"><rect class="shape" x="0" y="0" width="${W}" height="${H}"/>${lines}<text class="lbl" x="${W / 2}" y="-8" text-anchor="middle">${widthLabel}</text><text class="lbl" x="${W + 6}" y="${H / 2 + 5}">${heightLabel}</text></svg>`;
}

/** A triangle with a dashed height line and `base = b` / `height = h` labels. */
export function triangle(locale: Locale, b: number, h: number): string {
  const s = Math.min(200 / b, 110 / h);
  const B = b * s;
  const H = h * s;
  const apexX = B * 0.35;
  return `<svg viewBox="-20 -14 ${B + 60} ${H + 50}" width="${B + 60}" height="${H + 50}" role="img"><polygon class="shape" points="0,${H} ${B},${H} ${apexX},0"/><line x1="${apexX}" y1="0" x2="${apexX}" y2="${H}" stroke="var(--accent)" stroke-width="3" stroke-dasharray="6 5"/><text class="lbl" x="${B / 2}" y="${H + 22}" text-anchor="middle">${t(locale, 'base', 'base')} = ${b}</text><text class="lbl" x="${apexX + 6}" y="${H / 2}">${t(locale, 'height', 'altura')} = ${h}</text></svg>`;
}

/** An oblique rectangular box labelled length, height and width (volume). */
export function box(length: number, width: number, height: number): string {
  const s = Math.min(110 / length, 60 / height, 60 / width) * 1.2;
  const a = length * s;
  const b = height * s;
  const d = width * s * 0.55;
  return `<svg viewBox="-10 -10 ${a + d + 90} ${b + d + 40}" width="${a + d + 90}" height="${b + d + 40}" role="img"><polygon class="shape" points="0,${d} ${a},${d} ${a},${b + d} 0,${b + d}"/><polygon class="shape" points="0,${d} ${d},0 ${a + d},0 ${a},${d}"/><polygon class="shape" points="${a},${d} ${a + d},0 ${a + d},${b} ${a},${b + d}"/><text class="lbl" x="${a / 2}" y="${b + d + 18}" text-anchor="middle">${length}</text><text class="lbl" x="${a + d + 8}" y="${b / 2 + 4}">${height}</text><text class="lbl" x="${a + d * 0.45 + 4}" y="${d * 0.4}">${width}</text></svg>`;
}

/** Two rays forming an angle of `deg` degrees (0..180), with a square marker at 90. */
export function angle(deg: number): string {
  const rad = (deg * Math.PI) / 180;
  const X = 40;
  const Y = 100;
  const len = 100;
  const ex = X + len * Math.cos(rad);
  const ey = Y - len * Math.sin(rad);
  const marker =
    deg === 90
      ? `<path d="M${X + 20} ${Y}V${Y - 20}H${X}" fill="none" stroke="var(--accent)" stroke-width="3"/>`
      : `<path d="M${X + 30} ${Y}A30 30 0 0 0 ${(X + 30 * Math.cos(rad)).toFixed(1)} ${(Y - 30 * Math.sin(rad)).toFixed(1)}" fill="none" stroke="var(--accent)" stroke-width="3"/>`;
  return `<svg viewBox="0 0 160 120" width="200" height="150" role="img"><path d="M${ex.toFixed(1)} ${ey.toFixed(1)}L${X} ${Y}L${X + len} ${Y}" fill="none" stroke="var(--ink)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>${marker}</svg>`;
}

/** A named flat shape, drawn upright. */
export function shapeDrawing(key: ShapeKey): string {
  if (key === 'circle') {
    return '<svg viewBox="0 0 140 140" width="140" height="140" role="img"><circle class="shape" cx="70" cy="70" r="58"/></svg>';
  }
  if (key === 'square') {
    return '<svg viewBox="0 0 140 140" width="140" height="140" role="img"><rect class="shape" x="18" y="18" width="104" height="104" rx="2"/></svg>';
  }
  if (key === 'rectangle') {
    return '<svg viewBox="0 0 160 120" width="170" height="128" role="img"><rect class="shape" x="10" y="26" width="140" height="70" rx="2"/></svg>';
  }
  const sides = { triangle: 3, pentagon: 5, hexagon: 6, octagon: 8 }[key];
  return polygon(sides, -Math.PI / 2 + (sides % 2 === 0 ? Math.PI / sides : 0));
}
