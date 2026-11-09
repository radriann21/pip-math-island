import { act, render, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useConfetti } from './useConfetti';
import { useSound } from './useSound';
import { useToasts } from './useToasts';

class FakeParam {
  setValueAtTime = vi.fn();
  exponentialRampToValueAtTime = vi.fn();
}

function installAudio() {
  const oscillators: { type: string; frequency: { value: number }; start: ReturnType<typeof vi.fn> }[] = [];
  const created = vi.fn();
  const instances: { resume: ReturnType<typeof vi.fn> }[] = [];
  class FakeAudioContext {
    currentTime = 0;
    state: string = 'suspended';
    destination = {};
    resume = vi.fn(() => {
      this.state = 'running';
      return Promise.resolve();
    });
    constructor() {
      created();
      instances.push(this);
    }
    createOscillator() {
      const osc = { type: 'sine', frequency: { value: 0 }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
      oscillators.push(osc);
      return osc;
    }
    createGain() {
      return { gain: new FakeParam(), connect: vi.fn() };
    }
  }
  vi.stubGlobal('AudioContext', FakeAudioContext);
  return { oscillators, created, instances };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('useSound', () => {
  it('creates the AudioContext lazily on the first play, not on mount', () => {
    const audio = installAudio();
    const { result } = renderHook(() => useSound(true));
    expect(audio.created).not.toHaveBeenCalled();
    act(() => result.current('ok'));
    expect(audio.created).toHaveBeenCalledTimes(1);
    act(() => result.current('no'));
    expect(audio.created).toHaveBeenCalledTimes(1);
  });

  it('plays the prototype tones: ok is two notes, win is four, no is a low triangle, tick a short square', () => {
    const audio = installAudio();
    const { result } = renderHook(() => useSound(true));
    act(() => result.current('ok'));
    expect(audio.oscillators.map((o) => o.frequency.value)).toEqual([659, 880]);
    audio.oscillators.length = 0;
    act(() => result.current('win'));
    expect(audio.oscillators.map((o) => o.frequency.value)).toEqual([523, 659, 784, 1047]);
    audio.oscillators.length = 0;
    act(() => result.current('no'));
    expect(audio.oscillators.map((o) => [o.frequency.value, o.type])).toEqual([[240, 'triangle']]);
    audio.oscillators.length = 0;
    act(() => result.current('tick'));
    expect(audio.oscillators.map((o) => [o.frequency.value, o.type])).toEqual([[900, 'square']]);
  });

  it('stays silent and creates nothing when sound is disabled', () => {
    const audio = installAudio();
    const { result } = renderHook(() => useSound(false));
    act(() => result.current('win'));
    expect(audio.created).not.toHaveBeenCalled();
    expect(audio.oscillators).toHaveLength(0);
  });

  it('resumes a suspended context left by the browser autoplay policy', () => {
    const audio = installAudio();
    const { result } = renderHook(() => useSound(true));
    act(() => result.current('ok'));
    expect(audio.instances[0]?.resume).toHaveBeenCalledTimes(1);
  });

  it('never throws when audio is unsupported or the constructor fails', () => {
    vi.stubGlobal('AudioContext', undefined);
    vi.stubGlobal('webkitAudioContext', undefined);
    const { result } = renderHook(() => useSound(true));
    expect(() => act(() => result.current('ok'))).not.toThrow();

    class Broken {
      constructor() {
        throw new Error('blocked');
      }
    }
    vi.stubGlobal('AudioContext', Broken);
    const second = renderHook(() => useSound(true));
    expect(() => act(() => second.result.current('win'))).not.toThrow();
  });
});

describe('useToasts', () => {
  beforeEach(() => vi.useFakeTimers());

  it('shows a toast and removes it after a few seconds', () => {
    const { result } = renderHook(() => useToasts());
    act(() => result.current.push('New sticker'));
    expect(result.current.messages.map((m) => m.text)).toEqual(['New sticker']);
    act(() => vi.advanceTimersByTime(3300));
    expect(result.current.messages).toEqual([]);
  });

  it('keeps several toasts with unique ids and clears timers on unmount', () => {
    const { result, unmount } = renderHook(() => useToasts());
    act(() => {
      result.current.push('A');
      result.current.push('B');
    });
    expect(new Set(result.current.messages.map((m) => m.id)).size).toBe(2);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

function ConfettiProbe({ onReady }: { onReady(fire: () => void): void }) {
  const { fire, canvas } = useConfetti();
  onReady(fire);
  return canvas;
}

describe('useConfetti', () => {
  function setup(reduced: boolean) {
    const ctx = {
      clearRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      fillRect: vi.fn(),
      fillStyle: '',
      globalAlpha: 1,
    };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: reduced && q.includes('reduce') }));
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    let fire: () => void = () => undefined;
    const view = render(<ConfettiProbe onReady={(f) => (fire = f)} />);
    return { ctx, frames, fire: () => fire(), ...view };
  }

  afterEach(() => vi.restoreAllMocks());

  it('renders a decorative canvas that does not block clicks', () => {
    const { container } = setup(false);
    const canvas = container.querySelector('canvas');
    expect(canvas).toHaveAttribute('aria-hidden', 'true');
    expect(canvas?.style.pointerEvents).toBe('none');
  });

  it('draws animated pieces when fired', () => {
    const { ctx, frames, fire } = setup(false);
    act(() => fire());
    expect(frames.length).toBeGreaterThan(0);
    act(() => {
      frames.shift()?.(performance.now() + 16);
    });
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it('does nothing under prefers-reduced-motion', () => {
    const { ctx, frames, fire } = setup(true);
    act(() => fire());
    expect(frames).toHaveLength(0);
    expect(ctx.fillRect).not.toHaveBeenCalled();
  });

  it('cancels the animation when unmounted', () => {
    const { frames, fire, unmount } = setup(false);
    act(() => fire());
    expect(frames.length).toBeGreaterThan(0);
    unmount();
    expect(cancelAnimationFrame).toHaveBeenCalled();
  });
});
