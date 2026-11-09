import { useCallback, useEffect, useRef } from 'react';
import type { ReactElement } from 'react';

const COLORS = ['#ff7a1a', '#5b3df5', '#ffbd2e', '#2fb49f', '#e8588a', '#4c8dff'];
const PIECES = 130;
const DURATION_MS = 2400;

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  angle: number;
  spin: number;
}

/** A celebratory canvas effect. Render `canvas` once; call `fire()` to launch it. A no-op under reduced motion. */
export function useConfetti(): { fire(): void; canvas: ReactElement } {
  const ref = useRef<HTMLCanvasElement>(null);
  const frame = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  }, []);

  useEffect(() => stop, [stop]);

  const fire = useCallback(() => {
    const canvas = ref.current;
    if (!canvas || prefersReducedMotion()) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    stop();
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const pieces: Piece[] = Array.from({ length: PIECES }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * canvas.height * 0.4,
      vx: (Math.random() - 0.5) * 4,
      vy: 2 + Math.random() * 4,
      size: 6 + Math.random() * 7,
      color: COLORS[Math.floor(Math.random() * COLORS.length)] as string,
      angle: Math.random() * 6,
      spin: (Math.random() - 0.5) * 0.3,
    }));
    const startedAt = performance.now();
    const step = (now: number) => {
      const elapsed = now - startedAt;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (elapsed >= DURATION_MS) {
        frame.current = null;
        return;
      }
      for (const p of pieces) {
        p.x += p.vx;
        p.y += p.vy;
        p.angle += p.spin;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, 1 - elapsed / DURATION_MS);
        ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.6);
        ctx.restore();
      }
      frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
  }, [stop]);

  const canvas = (
    <canvas
      ref={ref}
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 40 }}
    />
  );
  return { fire, canvas };
}
