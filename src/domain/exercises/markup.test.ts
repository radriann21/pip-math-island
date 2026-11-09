import { describe, expect, it } from 'vitest';
import { EMPTY_BOX, equation, fraction, operator, priceTag, promptLine } from './markup';

describe('markup', () => {
  it('builds a fraction span with numerator and denominator', () => {
    expect(fraction(3, 4)).toBe('<span class="fr"><i>3</i><i>4</i></span>');
    expect(fraction('?', 8)).toBe('<span class="fr"><i>?</i><i>8</i></span>');
  });
  it('exposes the empty answer box', () => {
    expect(EMPTY_BOX).toBe('<span class="box">?</span>');
  });
  it('wraps rich-text pieces', () => {
    expect(operator('+')).toBe('<span class="op">+</span>');
    expect(priceTag('$1.50')).toBe('<span class="tag">$1.50</span>');
    expect(equation('a', 'b')).toBe('<div class="eq">ab</div>');
    expect(promptLine('1 < 2')).toBe('<div class="prompt">1 < 2</div>');
  });
});
