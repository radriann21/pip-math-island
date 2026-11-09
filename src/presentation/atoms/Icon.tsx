import type { TopicId } from '@/domain/shared/types';

export type IconName = TopicId | 'race';

const PATHS: Record<IconName, JSX.Element> = {
  count: (
    <>
      <circle cx="7" cy="21" r="4" />
      <circle cx="16" cy="11" r="4" />
      <circle cx="25" cy="21" r="4" />
    </>
  ),
  add: <path d="M16 5v22M5 16h22" strokeWidth="4.5" />,
  sub: <path d="M5 16h22" strokeWidth="4.5" />,
  mul: <path d="M8 8l16 16M24 8L8 24" strokeWidth="4.5" />,
  div: (
    <>
      <path d="M5 16h22" strokeWidth="4" />
      <circle cx="16" cy="7" r="2.5" fill="currentColor" />
      <circle cx="16" cy="25" r="2.5" fill="currentColor" />
    </>
  ),
  frac: (
    <>
      <circle cx="16" cy="16" r="11" strokeWidth="3" />
      <path d="M16 16V5a11 11 0 0 1 11 11z" fill="currentColor" />
    </>
  ),
  place: (
    <>
      <rect x="4" y="12" width="12" height="12" fill="currentColor" opacity=".35" strokeWidth="2.5" />
      <rect x="19" y="6" width="4" height="18" fill="currentColor" strokeWidth="2" />
      <rect x="26" y="19" width="4" height="5" fill="currentColor" />
    </>
  ),
  time: (
    <>
      <circle cx="16" cy="16" r="12" strokeWidth="3" />
      <path d="M16 8v8l5 3" strokeWidth="3" />
    </>
  ),
  money: (
    <>
      <circle cx="16" cy="16" r="12" strokeWidth="3" />
      <text x="16" y="22" textAnchor="middle" fontSize="17" fontWeight="700" fill="currentColor" stroke="none">
        $
      </text>
    </>
  ),
  geo: <path d="M16 4L29 27H3z" strokeWidth="3.5" />,
  pattern: <path d="M3 22L9 10l7 12 7-12 6 12" strokeWidth="3.5" />,
  word: (
    <>
      <path d="M6 6h20a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H14l-6 5v-5H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" strokeWidth="3" />
      <path d="M10 12h12M10 16h8" strokeWidth="2.5" />
    </>
  ),
  race: <path d="M13 3L5 17h7l-2 12 11-16h-7z" fill="currentColor" />,
};

interface IconProps {
  name: IconName;
  className?: string;
}

/** Decorative topic icon drawn in `currentColor`; give the surrounding control an accessible name. */
export function Icon({ name, className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
