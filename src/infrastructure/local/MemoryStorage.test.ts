import { describe, expect, it } from 'vitest';
import { MemoryStorage } from './MemoryStorage';

describe('MemoryStorage', () => {
  it('stores, reads and removes values', () => {
    const s = new MemoryStorage();
    expect(s.getItem('a')).toBeNull();
    s.setItem('a', '1');
    expect(s.getItem('a')).toBe('1');
    s.removeItem('a');
    expect(s.getItem('a')).toBeNull();
  });
  it('can be seeded and exposes a snapshot of its keys', () => {
    const s = new MemoryStorage({ a: '1', b: '2' });
    expect(s.keys().sort()).toEqual(['a', 'b']);
  });
});
