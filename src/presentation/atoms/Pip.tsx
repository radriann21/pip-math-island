import { useI18n } from '../i18n';

export type PipMood = 'happy' | 'cheer' | 'think' | 'sad';

interface PipProps {
  mood?: PipMood;
  size?: number;
  /** Accessible name; defaults to the translated mascot name. */
  label?: string;
  /** Hide from assistive technology when the mascot is only ornament next to real text. */
  decorative?: boolean;
}

const EYES: Record<PipMood, JSX.Element> = {
  happy: (
    <>
      <circle cx="45" cy="56" r="6" fill="#2a1a14" />
      <circle cx="75" cy="56" r="6" fill="#2a1a14" />
      <circle cx="47" cy="54" r="2" fill="#fff" />
      <circle cx="77" cy="54" r="2" fill="#fff" />
    </>
  ),
  think: (
    <>
      <circle cx="45" cy="56" r="6" fill="#2a1a14" />
      <circle cx="75" cy="56" r="6" fill="#2a1a14" />
      <circle cx="47" cy="54" r="2" fill="#fff" />
      <circle cx="77" cy="54" r="2" fill="#fff" />
    </>
  ),
  cheer: <path d="M38 54q7-9 14 0M68 54q7-9 14 0" stroke="#2a1a14" strokeWidth="4" fill="none" strokeLinecap="round" />,
  sad: (
    <>
      <circle cx="45" cy="56" r="5.5" fill="#2a1a14" />
      <circle cx="75" cy="56" r="5.5" fill="#2a1a14" />
      <path d="M36 46l16 4M84 46l-16 4" stroke="#2a1a14" strokeWidth="3" strokeLinecap="round" />
    </>
  ),
};

const MOUTH: Record<PipMood, JSX.Element> = {
  happy: <path d="M48 72q12 12 24 0" stroke="#2a1a14" strokeWidth="3.5" fill="none" strokeLinecap="round" />,
  cheer: (
    <>
      <path d="M44 70q16 26 32 0z" fill="#7a2a1a" />
      <path d="M52 80q8 6 16 0" fill="#ff8b94" />
    </>
  ),
  sad: <path d="M48 80q12-12 24 0" stroke="#2a1a14" strokeWidth="3.5" fill="none" strokeLinecap="round" />,
  think: <path d="M50 77q10-4 20 1" stroke="#2a1a14" strokeWidth="3.5" fill="none" strokeLinecap="round" />,
};

/** The fox mascot. Inline SVG ported from the prototype; the mood changes the eyes and mouth. */
export function Pip({ mood = 'happy', size = 110, label, decorative = false }: PipProps) {
  const { t } = useI18n();
  const a11y = decorative
    ? { 'aria-hidden': true as const }
    : { role: 'img' as const, 'aria-label': label ?? t('common.pip') };
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} {...a11y}>
      <path d="M22 44L30 8l28 20z" fill="#ff8a2a" />
      <path d="M98 44L90 8 62 28z" fill="#ff8a2a" />
      <path d="M30 36l4-16 12 10z" fill="#ffc9a0" />
      <path d="M90 36l-4-16-12 10z" fill="#ffc9a0" />
      <ellipse cx="60" cy="62" rx="44" ry="40" fill="#ff8a2a" />
      <ellipse cx="60" cy="74" rx="26" ry="19" fill="#fff1e2" />
      {EYES[mood]}
      <ellipse cx="60" cy="65" rx="5.5" ry="4.2" fill="#3a2418" />
      {MOUTH[mood]}
      <circle cx="30" cy="68" r="6" fill="#ff6f6f" opacity=".35" />
      <circle cx="90" cy="68" r="6" fill="#ff6f6f" opacity=".35" />
      <path d="M60 104L42 95v18zM60 104l18-9v18z" fill="#5b3df5" />
      <circle cx="60" cy="104" r="4.5" fill="#3a2dbf" />
    </svg>
  );
}
