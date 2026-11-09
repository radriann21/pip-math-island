/**
 * Trusted rich-text markup helpers. Everything produced here is built from generator-controlled
 * values only (never user input), so it is safe to render as HTML in the presentation layer.
 */

/** A stacked fraction, e.g. 3/4. Styled by the `.fr` CSS class. */
export function fraction(numerator: number | string, denominator: number | string): string {
  return `<span class="fr"><i>${numerator}</i><i>${denominator}</i></span>`;
}

/** The empty "?" answer box used inside prompts. */
export const EMPTY_BOX = '<span class="box">?</span>';

/** An operator glyph between two visuals (`.op`). */
export function operator(symbol: string): string {
  return `<span class="op">${symbol}</span>`;
}

/** A price tag chip (`.tag`). */
export function priceTag(text: string): string {
  return `<span class="tag">${text}</span>`;
}

/** A horizontal row of visuals (`.eq`). */
export function equation(...parts: string[]): string {
  return `<div class="eq">${parts.join('')}</div>`;
}

/** A large centred line of text inside the visual area (`.prompt`). */
export function promptLine(content: string): string {
  return `<div class="prompt">${content}</div>`;
}
