import { describe, expect, it } from 'vitest';
import { NotFoundError, StorageError, ValidationError } from '@/application/errors';
import { LocalChildRepository, MAX_CHILDREN } from './LocalChildRepository';
import { MemoryStorage } from './MemoryStorage';
import { CHILDREN_KEY } from './keys';

const ana = { name: 'Ana', grade: 2 as const, locale: 'es' as const, soundEnabled: true };

function setup(initial: Record<string, string> = {}) {
  const storage = new MemoryStorage(initial);
  let n = 0;
  const repo = new LocalChildRepository(storage, () => `id-${++n}`);
  return { storage, repo };
}

describe('LocalChildRepository', () => {
  it('starts empty', async () => {
    expect(await setup().repo.list()).toEqual([]);
  });
  it('creates children with generated ids and keeps creation order', async () => {
    const { repo } = setup();
    const a = await repo.create(ana);
    const b = await repo.create({ ...ana, name: 'Bo' });
    expect(a).toEqual({ ...ana, id: 'id-1' });
    expect((await repo.list()).map((c) => c.name)).toEqual(['Ana', 'Bo']);
    expect(b.id).toBe('id-2');
  });
  it('persists under the namespaced key and reloads in a fresh instance', async () => {
    const { repo, storage } = setup();
    await repo.create(ana);
    expect(storage.getItem(CHILDREN_KEY)).not.toBeNull();
    expect(await new LocalChildRepository(storage).list()).toHaveLength(1);
  });
  it('uses crypto.randomUUID by default', async () => {
    const repo = new LocalChildRepository(new MemoryStorage());
    const c = await repo.create(ana);
    expect(c.id).toMatch(/^[0-9a-f-]{36}$/);
  });
  it('updates a child and trims the name', async () => {
    const { repo } = setup();
    const a = await repo.create(ana);
    expect(await repo.update(a.id, { grade: 4, name: '  Anita ' })).toEqual({ ...a, grade: 4, name: 'Anita' });
    expect((await repo.list())[0]?.grade).toBe(4);
  });
  it('removes a child', async () => {
    const { repo } = setup();
    const a = await repo.create(ana);
    await repo.remove(a.id);
    expect(await repo.list()).toEqual([]);
  });
  it('throws NotFoundError for unknown ids', async () => {
    const { repo } = setup();
    await expect(repo.update('nope', { name: 'x' })).rejects.toBeInstanceOf(NotFoundError);
    await expect(repo.remove('nope')).rejects.toBeInstanceOf(NotFoundError);
  });
  it('validates name, grade and locale like the database checks', async () => {
    const { repo } = setup();
    await expect(repo.create({ ...ana, name: '   ' })).rejects.toBeInstanceOf(ValidationError);
    await expect(repo.create({ ...ana, name: 'x'.repeat(25) })).rejects.toBeInstanceOf(ValidationError);
    await expect(repo.create({ ...ana, grade: 7 as never })).rejects.toBeInstanceOf(ValidationError);
    await expect(repo.create({ ...ana, locale: 'fr' as never })).rejects.toBeInstanceOf(ValidationError);
    const a = await repo.create(ana);
    await expect(repo.update(a.id, { name: '' })).rejects.toBeInstanceOf(ValidationError);
  });
  it('allows at most 8 children per parent', async () => {
    const { repo } = setup();
    for (let i = 0; i < MAX_CHILDREN; i++) await repo.create({ ...ana, name: `Kid${i}` });
    await expect(repo.create(ana)).rejects.toBeInstanceOf(ValidationError);
    expect(await repo.list()).toHaveLength(8);
  });
  it('recovers from corrupt JSON by returning no children', async () => {
    const { repo } = setup({ [CHILDREN_KEY]: '{not json' });
    expect(await repo.list()).toEqual([]);
    await expect(repo.create(ana)).resolves.toMatchObject({ name: 'Ana' });
  });
  it('drops malformed entries and coerces out-of-range values', async () => {
    const blob = JSON.stringify([
      { id: 'ok', name: 'Zed', grade: 9, locale: 'fr', soundEnabled: 'yes' },
      { id: 'noname', grade: 2 },
      'junk',
      null,
      { id: 'ok', name: 'Dup', grade: 1, locale: 'en', soundEnabled: true },
    ]);
    const { repo } = setup({ [CHILDREN_KEY]: blob });
    expect(await repo.list()).toEqual([{ id: 'ok', name: 'Zed', grade: 6, locale: 'en', soundEnabled: true }]);
  });
  it('ignores a blob that is not an array', async () => {
    expect(await setup({ [CHILDREN_KEY]: '{"a":1}' }).repo.list()).toEqual([]);
  });
  it('wraps storage write failures in StorageError', async () => {
    const storage = new MemoryStorage();
    storage.setItem = () => {
      throw new Error('quota');
    };
    const repo = new LocalChildRepository(storage);
    await expect(repo.create(ana)).rejects.toBeInstanceOf(StorageError);
    await expect(repo.create(ana)).rejects.toMatchObject({ cause: expect.objectContaining({ message: 'quota' }) });
  });
  it('returns copies so callers cannot mutate storage', async () => {
    const { repo } = setup();
    const a = await repo.create(ana);
    a.name = 'Hacked';
    expect((await repo.list())[0]?.name).toBe('Ana');
  });
});
