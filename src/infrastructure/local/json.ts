import { StorageError } from '@/application/errors';
import type { KeyValueStorage } from './KeyValueStorage';

/** Reads and parses a JSON blob. Missing, unreadable or corrupt data yields `undefined`, never an exception. */
export function readJson(storage: KeyValueStorage, key: string): unknown {
  try {
    const raw = storage.getItem(key);
    return raw === null ? undefined : JSON.parse(raw);
  } catch {
    return undefined;
  }
}

/** Writes a JSON blob. A refusing storage (quota, privacy mode) becomes a StorageError. */
export function writeJson(storage: KeyValueStorage, key: string, value: unknown): void {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch (cause) {
    throw new StorageError('Could not save on this device', { cause });
  }
}

export type IdFactory = () => string;

export const defaultIdFactory: IdFactory = () => crypto.randomUUID();
