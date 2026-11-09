import { useCallback, useEffect, useRef } from 'react';

export type SoundKind = 'ok' | 'no' | 'win' | 'tick';

type AudioContextCtor = new () => AudioContext;

function audioContextConstructor(): AudioContextCtor | null {
  const w = window as unknown as { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

function tone(ctx: AudioContext, freq: number, start: number, duration: number, type: OscillatorType = 'sine', volume = 0.12) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const at = ctx.currentTime + start;
  gain.gain.setValueAtTime(volume, at);
  gain.gain.exponentialRampToValueAtTime(0.001, at + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(at);
  osc.stop(at + duration + 0.02);
}

const SOUNDS: Record<SoundKind, (ctx: AudioContext) => void> = {
  ok: (ctx) => {
    tone(ctx, 659, 0, 0.12);
    tone(ctx, 880, 0.1, 0.18);
  },
  no: (ctx) => tone(ctx, 240, 0, 0.22, 'triangle', 0.14),
  win: (ctx) => [523, 659, 784, 1047].forEach((f, i) => tone(ctx, f, i * 0.11, 0.25)),
  tick: (ctx) => tone(ctx, 900, 0, 0.05, 'square', 0.04),
};

/**
 * Tiny WebAudio sound effects ported from the prototype. The AudioContext is created on the first call
 * (always triggered by a tap or key press, which satisfies browser autoplay rules) and playing never throws.
 */
export function useSound(enabled: boolean): (kind: SoundKind) => void {
  const ctxRef = useRef<AudioContext | null>(null);
  const enabledRef = useRef(enabled);
  useEffect(() => {
    enabledRef.current = enabled;
  });

  return useCallback((kind: SoundKind) => {
    if (!enabledRef.current) return;
    try {
      if (!ctxRef.current) {
        const Ctor = audioContextConstructor();
        if (!Ctor) return;
        ctxRef.current = new Ctor();
      }
      const ctx = ctxRef.current;
      if (ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
      SOUNDS[kind](ctx);
    } catch {
      // Sound is a nicety: a blocked or missing audio device must never break the game.
    }
  }, []);
}
