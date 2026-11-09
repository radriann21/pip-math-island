import { NotFoundError, ValidationError } from '@/application/errors';
import type { Child } from '@/application/model';
import type { ChildRepository } from '@/application/ports';
import { asRecord, toGrade, toLocale } from '../coerce';
import { type IdFactory, defaultIdFactory, readJson, writeJson } from './json';
import type { KeyValueStorage } from './KeyValueStorage';
import { CHILDREN_KEY, progressKeyFor } from './keys';

/** Same limit as the `enforce_max_children` database trigger. */
export const MAX_CHILDREN = 8;
const MAX_NAME = 24;

function parseChild(value: unknown): Child | null {
  const r = asRecord(value);
  if (!r || typeof r.id !== 'string' || r.id === '' || typeof r.name !== 'string') return null;
  const name = r.name.trim();
  if (name === '' || name.length > MAX_NAME) return null;
  return {
    id: r.id,
    name,
    grade: toGrade(r.grade),
    locale: toLocale(r.locale),
    soundEnabled: typeof r.soundEnabled === 'boolean' ? r.soundEnabled : true,
  };
}

function checkFields(fields: Partial<Omit<Child, 'id'>>): void {
  if (fields.name !== undefined) {
    const name = fields.name.trim();
    if (name.length < 1 || name.length > MAX_NAME) throw new ValidationError(`Name must be 1 to ${MAX_NAME} characters`);
  }
  if (fields.grade !== undefined && (!Number.isInteger(fields.grade) || fields.grade < 1 || fields.grade > 6)) {
    throw new ValidationError('Grade must be 1 to 6');
  }
  if (fields.locale !== undefined && fields.locale !== 'en' && fields.locale !== 'es') {
    throw new ValidationError('Locale must be en or es');
  }
}

/** Guest-mode child profiles kept in a single JSON array. Corrupt data degrades to "no children". */
export class LocalChildRepository implements ChildRepository {
  constructor(
    private readonly storage: KeyValueStorage,
    private readonly newId: IdFactory = defaultIdFactory,
  ) {}

  async list(): Promise<Child[]> {
    return this.read();
  }

  async create(input: Omit<Child, 'id'>): Promise<Child> {
    checkFields(input);
    const all = this.read();
    if (all.length >= MAX_CHILDREN) throw new ValidationError(`A parent can have at most ${MAX_CHILDREN} child profiles`);
    const child: Child = { ...input, name: input.name.trim(), id: this.newId() };
    writeJson(this.storage, CHILDREN_KEY, [...all, child]);
    return { ...child };
  }

  async update(id: string, patch: Partial<Omit<Child, 'id'>>): Promise<Child> {
    checkFields(patch);
    const all = this.read();
    const current = all.find((c) => c.id === id);
    if (!current) throw new NotFoundError(`child ${id} not found`);
    const next: Child = { ...current, ...patch, id, name: (patch.name ?? current.name).trim() };
    writeJson(this.storage, CHILDREN_KEY, all.map((c) => (c.id === id ? next : c)));
    return { ...next };
  }

  async remove(id: string): Promise<void> {
    const all = this.read();
    if (!all.some((c) => c.id === id)) throw new NotFoundError(`child ${id} not found`);
    writeJson(this.storage, CHILDREN_KEY, all.filter((c) => c.id !== id));
    try {
      this.storage.removeItem(progressKeyFor(id));
    } catch {
      // The orphaned blob is unreachable and harmless.
    }
  }

  private read(): Child[] {
    const raw = readJson(this.storage, CHILDREN_KEY);
    if (!Array.isArray(raw)) return [];
    const seen = new Set<string>();
    const out: Child[] = [];
    for (const item of raw) {
      const child = parseChild(item);
      if (child && !seen.has(child.id)) {
        seen.add(child.id);
        out.push(child);
      }
    }
    return out.slice(0, MAX_CHILDREN);
  }
}
