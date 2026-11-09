/** Ids defined by the sprite. Domain markup and the UI reference them through `<use href="#id">` / `url(#id)`. */
export const SPRITE_IDS = [
  'i-star',
  'i-starc',
  'i-flame',
  'i-bolt',
  'i-crown',
  'i-heart',
  'i-medal',
  'i-apple',
  'i-balloon',
  'i-cookie',
  'pgH',
  'pgT',
  'pgO',
] as const;

/**
 * Hidden SVG sprite with every symbol and fill pattern used across the app. Render it exactly once near the
 * root of the page, so inline SVGs from the domain (`<use href="#i-apple">`, `fill="url(#pgH)"`) resolve.
 */
export function Sprite() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <defs>
        <symbol id="i-star" viewBox="0 0 24 24">
          <polygon points="12,1.8 15,8.6 22.4,9.3 16.8,14.2 18.5,21.6 12,17.7 5.5,21.6 7.2,14.2 1.6,9.3 9,8.6" fill="currentColor" />
        </symbol>
        <symbol id="i-starc" viewBox="0 0 24 24">
          <polygon
            points="12,1.8 15,8.6 22.4,9.3 16.8,14.2 18.5,21.6 12,17.7 5.5,21.6 7.2,14.2 1.6,9.3 9,8.6"
            fill="#ffbd2e"
            stroke="#d9890b"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </symbol>
        <symbol id="i-flame" viewBox="0 0 24 24">
          <path d="M12 2c1 4.5 6.5 6.5 6.5 12.5a6.5 6.5 0 0 1-13 0c0-3 1.7-4.6 3-7 .9 1 1.6 2 1.8 3.2C11.6 8.3 12 5.5 12 2z" fill="currentColor" />
        </symbol>
        <symbol id="i-bolt" viewBox="0 0 24 24">
          <polygon points="13.5,1.5 4,13.5 11,13.5 9.5,22.5 20,9.5 13,9.5" fill="currentColor" />
        </symbol>
        <symbol id="i-crown" viewBox="0 0 24 24">
          <path d="M2.5 7.5l5.2 4.7L12 4l4.3 8.2 5.2-4.7-2 12.5H4.5z" fill="currentColor" />
        </symbol>
        <symbol id="i-heart" viewBox="0 0 24 24">
          <path d="M12 21.5s-8.5-5.6-8.5-11.4A4.6 4.6 0 0 1 12 7.6a4.6 4.6 0 0 1 8.5 2.5c0 5.8-8.5 11.4-8.5 11.4z" fill="currentColor" />
        </symbol>
        <symbol id="i-medal" viewBox="0 0 24 24">
          <path d="M6 1.5l3.5 7h5l3.5-7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
          <circle cx="12" cy="15" r="6.5" fill="currentColor" />
        </symbol>
        <symbol id="i-apple" viewBox="0 0 24 24">
          <path d="M12 7.5c-3-2.2-8-.2-8 5.8 0 5 3 9 5 9 1.2 0 1.8-.6 3-.6s1.8.6 3 .6c2 0 5-4 5-9 0-6-5-8-8-5.8z" fill="#e5484d" />
          <path d="M12 7.5c0-2.8 1-4.3 3-5" stroke="#6b4423" strokeWidth="1.7" fill="none" strokeLinecap="round" />
          <path d="M14 4.5c2-1.2 4.2-.2 4.2 1.5-2.2.9-4.2 0-4.2-1.5z" fill="#3fae5a" />
        </symbol>
        <symbol id="i-balloon" viewBox="0 0 24 24">
          <ellipse cx="12" cy="9" rx="6.5" ry="7.5" fill="#4c8dff" />
          <path d="M12 16.5l-1.6 2.5h3.2z" fill="#4c8dff" />
          <path d="M12 19c-1.2 2 1.2 3 0 4.5" stroke="#8a93b5" fill="none" strokeWidth="1.2" />
          <ellipse cx="9.5" cy="6.5" rx="1.5" ry="2.3" fill="#fff" opacity=".45" />
        </symbol>
        <symbol id="i-cookie" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9.8" fill="#d9a066" stroke="#a8702f" strokeWidth="1.5" />
          <circle cx="8.5" cy="9" r="1.7" fill="#6b3f1d" />
          <circle cx="15" cy="8.5" r="1.5" fill="#6b3f1d" />
          <circle cx="14" cy="15" r="1.8" fill="#6b3f1d" />
          <circle cx="8.5" cy="15" r="1.4" fill="#6b3f1d" />
        </symbol>
        <pattern id="pgH" width="6.6" height="6.6" patternUnits="userSpaceOnUse">
          <rect width="6.6" height="6.6" fill="#5b8cff" />
          <path d="M0 0H6.6V6.6" fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth=".8" />
        </pattern>
        <pattern id="pgT" width="6.6" height="6.6" patternUnits="userSpaceOnUse">
          <rect width="6.6" height="6.6" fill="#2fb49f" />
          <path d="M0 0H6.6V6.6" fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth=".8" />
        </pattern>
        <pattern id="pgO" width="6.6" height="6.6" patternUnits="userSpaceOnUse">
          <rect width="6.6" height="6.6" fill="#ffb02e" />
          <path d="M0 0H6.6V6.6" fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth=".8" />
        </pattern>
      </defs>
    </svg>
  );
}
