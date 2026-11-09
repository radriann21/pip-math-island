import type { KeyValueStorage } from './KeyValueStorage';

/** In-memory KeyValueStorage for tests and as a fallback when localStorage is unavailable. */
export class MemoryStorage implements KeyValueStorage {
  private readonly data: Map<string, string>;

  constructor(initial: Record<string, string> = {}) {
    this.data = new Map(Object.entries(initial));
  }

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  keys(): string[] {
    return [...this.data.keys()];
  }
}
