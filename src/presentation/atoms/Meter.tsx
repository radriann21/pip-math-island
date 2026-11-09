interface MeterProps {
  /** Percentage, 0..100 (values outside are clamped). */
  value: number;
  /** Accessible name, e.g. "Level progress". */
  label: string;
}

export function Meter({ value, label }: MeterProps) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className="pip-meter"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
    >
      <i style={{ width: `${pct}%` }} />
    </div>
  );
}
