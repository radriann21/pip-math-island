import { describe, expect, it } from 'vitest';
import {
  angle,
  bar,
  baseTenBlocks,
  box,
  clock,
  coins,
  dotsArray,
  items,
  pie,
  plates,
  polygon,
  rectangle,
  sequenceBoxes,
  shapeDrawing,
  SHAPES,
  triangle,
} from './index';

const count = (s: string, needle: string) => s.split(needle).length - 1;

describe('items', () => {
  it('draws one <use> per item referencing the sprite symbol', () => {
    const svg = items(3, 'apple');
    expect(count(svg, '<use')).toBe(3);
    expect(svg).toContain('href="#i-apple"');
    expect(svg).toContain('aria-label="3"');
  });
  it('wraps rows and sizes the viewBox', () => {
    const svg = items(7, 'starc', { per: 5, sz: 36 });
    expect(svg).toContain('viewBox="0 0 180 72"');
  });
  it('crosses out the last N items', () => {
    const svg = items(5, 'cookie', { sz: 26, cross: 2 });
    expect(count(svg, 'class="xx"')).toBe(2);
    expect(items(5, 'cookie')).not.toContain('class="xx"');
  });
});

describe('dotsArray', () => {
  it('draws rows x cols circles', () => {
    const svg = dotsArray(3, 4);
    expect(count(svg, '<circle')).toBe(12);
    expect(svg).toContain('aria-label="3 x 4"');
    expect(svg).toContain('viewBox="0 0 104 78"');
  });
});

describe('plates', () => {
  it('draws k plates', () => {
    expect(count(plates(3), 'class="plate"')).toBe(3);
  });
});

describe('pie and bar', () => {
  it('pie(2,4) has 4 wedges with 2 filled', () => {
    const svg = pie(2, 4);
    expect(count(svg, '<path')).toBe(4);
    expect(count(svg, 'fill:var(--violet)')).toBe(2);
    expect(count(svg, 'fill:var(--card)')).toBe(2);
    expect(svg).toContain('aria-label="2/4"');
  });
  it('pie with one part is a full circle', () => {
    expect(pie(1, 1)).toContain('<circle');
    expect(pie(0, 1)).toContain('fill:var(--card)');
  });
  it('bar(3,5) has 5 cells with 3 filled', () => {
    const svg = bar(3, 5);
    expect(count(svg, '<rect')).toBe(5);
    expect(count(svg, 'fill:var(--violet)')).toBe(3);
  });
});

describe('baseTenBlocks', () => {
  it('draws hundreds, tens and ones', () => {
    const svg = baseTenBlocks(234);
    expect(count(svg, 'fill="url(#pgH)"')).toBe(2);
    expect(count(svg, 'fill="url(#pgT)"')).toBe(3);
    expect(count(svg, 'fill="url(#pgO)"')).toBe(4);
    expect(svg).toContain('aria-label="234"');
  });
  it('omits empty places', () => {
    const svg = baseTenBlocks(40);
    expect(svg).not.toContain('#pgH');
    expect(svg).not.toContain('#pgO');
  });
});

describe('clock', () => {
  it('has 12 numerals and 60 ticks', () => {
    const svg = clock(3, 15);
    expect(count(svg, 'class="clk-n"')).toBe(12);
    expect(count(svg, '<line x1')).toBe(60);
    expect(svg).toContain('aria-label="3:15"');
  });
  it('puts the minute hand at 3 o\'clock for 15 minutes', () => {
    const svg = clock(3, 15);
    // minute hand points right: x2 = 70 + 48, y2 = 70
    expect(svg).toContain('class="hand m" stroke-width="4" x1="70" y1="70" x2="118.0" y2="70.0"');
  });
  it('puts the hour hand straight up at 12:00 and straight right at 3:00', () => {
    expect(clock(12, 0)).toContain('class="hand" stroke-width="7" x1="70" y1="70" x2="70.0" y2="38.0"');
    expect(clock(3, 0)).toContain('class="hand" stroke-width="7" x1="70" y1="70" x2="102.0" y2="70.0"');
  });
  it('pads minutes in the label', () => {
    expect(clock(7, 5)).toContain('aria-label="7:05"');
  });
});

describe('coins', () => {
  it('draws coins below 20 and bills from 20', () => {
    const svg = coins([1, 5, 10, 20, 50]);
    expect(count(svg, 'class="coin"')).toBe(3);
    expect(count(svg, 'class="bill"')).toBe(2);
    expect(svg).toContain('>50<');
  });
});

describe('shapes', () => {
  it('polygon has n points', () => {
    const svg = polygon(5, 0);
    const points = /points="([^"]+)"/.exec(svg)?.[1] ?? '';
    expect(points.split(' ')).toHaveLength(5);
  });
  it('rectangle draws a grid only when asked', () => {
    expect(count(rectangle(4, 3, 4, 3, true), '<line')).toBe(3 + 2);
    expect(count(rectangle(4, 3, 4, 3, false), '<line')).toBe(0);
  });
  it('rectangle shows the side labels', () => {
    const svg = rectangle(4, 3, 4, 3, false);
    expect(count(svg, 'class="lbl"')).toBe(2);
  });
  it('triangle labels follow the locale', () => {
    expect(triangle('en', 6, 4)).toContain('height = 4');
    expect(triangle('es', 6, 4)).toContain('altura = 4');
    expect(triangle('es', 6, 4)).toContain('base = 6');
  });
  it('box shows three faces and three labels', () => {
    const svg = box(4, 3, 2);
    expect(count(svg, '<polygon')).toBe(3);
    expect(count(svg, 'class="lbl"')).toBe(3);
  });
  it('angle draws a square corner for 90 degrees and an arc otherwise', () => {
    expect(angle(90)).toContain('V80H40');
    expect(angle(45)).toContain('A30 30');
  });
  it('shapeDrawing returns a drawing for every shape', () => {
    for (const s of SHAPES) expect(shapeDrawing(s.key)).toContain('<svg');
    expect(shapeDrawing('circle')).toContain('<circle');
    expect(shapeDrawing('hexagon')).toContain('<polygon');
  });
  it('SHAPES carries names in both languages and side counts', () => {
    const hex = SHAPES.find((s) => s.key === 'hexagon');
    expect(hex).toMatchObject({ en: 'hexagon', es: 'hexágono', sides: 6 });
  });
});

describe('sequenceBoxes', () => {
  it('hides the chosen index and formats numbers', () => {
    const html = sequenceBoxes('en', [1000, 2000, 3000], 1);
    expect(html).toBe('<div class="seq"><b>1,000</b><b class="q">?</b><b>3,000</b></div>');
    expect(sequenceBoxes('es', [10000, 2], 1)).toContain('10.000');
  });
});
