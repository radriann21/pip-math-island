import { describe, expect, it } from 'vitest';
import { AuthError, NotFoundError, StorageError, ValidationError } from '@/application/errors';
import { SupabaseChildRepository } from './SupabaseChildRepository';
import { createFakeSupabase, opNames } from './testing/fakeSupabase';

const row = (over: Record<string, unknown> = {}) => ({
  id: 'c1',
  parent_id: 'parent-1',
  name: 'Ana',
  grade: 2,
  locale: 'es',
  sound_enabled: true,
  xp: 0,
  streak: 0,
  last_played: null,
  rounds_total: 0,
  race_best: 0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...over,
});
const ana = { id: 'c1', name: 'Ana', grade: 2, locale: 'es', soundEnabled: true };
const pgError = (code: string, message = 'raw sql text') => ({ code, message, details: '', hint: '' });

describe('SupabaseChildRepository', () => {
  it('lists children ordered by creation date', async () => {
    const f = createFakeSupabase({ tables: { children: { data: [row(), row({ id: 'c2', name: 'Bo' })], error: null } } });
    const list = await new SupabaseChildRepository(f.client).list();
    expect(list.map((c) => c.name)).toEqual(['Ana', 'Bo']);
    expect(f.calls[0]?.table).toBe('children');
    expect(f.calls[0]?.ops).toContainEqual({ method: 'order', args: ['created_at', { ascending: true }] });
  });
  it('maps list errors', async () => {
    const f = createFakeSupabase({ tables: { children: { data: null, error: pgError('XX000') } } });
    await expect(new SupabaseChildRepository(f.client).list()).rejects.toBeInstanceOf(StorageError);
  });
  it('creates a child with parent_id from the current session user', async () => {
    const f = createFakeSupabase({ tables: { children: { data: row(), error: null } } });
    const created = await new SupabaseChildRepository(f.client).create({ name: ' Ana ', grade: 2, locale: 'es', soundEnabled: true });
    expect(created).toEqual(ana);
    expect(f.calls[0]?.ops[0]).toEqual({
      method: 'insert',
      args: [{ parent_id: 'parent-1', name: 'Ana', grade: 2, locale: 'es', sound_enabled: true }],
    });
    expect(opNames(f.calls[0])).toEqual(['insert', 'select', 'single']);
  });
  it('refuses to create when nobody is signed in', async () => {
    const f = createFakeSupabase({ session: null });
    await expect(new SupabaseChildRepository(f.client).create({ name: 'Ana', grade: 2, locale: 'es', soundEnabled: true })).rejects.toBeInstanceOf(AuthError);
    expect(f.calls).toHaveLength(0);
  });
  it('turns the 8-children trigger into a readable ValidationError', async () => {
    const f = createFakeSupabase({ tables: { children: { data: null, error: pgError('23514', 'A parent can have at most 8 child profiles') } } });
    const err = await new SupabaseChildRepository(f.client)
      .create({ name: 'Ana', grade: 2, locale: 'es', soundEnabled: true })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ValidationError);
    expect((err as Error).message).toBe('A parent can have at most 8 child profiles');
  });
  it('maps other create errors without leaking SQL', async () => {
    const f = createFakeSupabase({ tables: { children: { data: null, error: pgError('23514', 'new row violates check constraint "children_name_check"') } } });
    const err = await new SupabaseChildRepository(f.client)
      .create({ name: 'Ana', grade: 2, locale: 'es', soundEnabled: true })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ValidationError);
    expect((err as Error).message).not.toContain('children_name_check');
  });
  it('updates by id and returns the mapped row', async () => {
    const f = createFakeSupabase({ tables: { children: { data: row({ grade: 4 }), error: null } } });
    const updated = await new SupabaseChildRepository(f.client).update('c1', { grade: 4 });
    expect(updated.grade).toBe(4);
    expect(f.calls[0]?.ops).toEqual([
      { method: 'update', args: [{ grade: 4 }] },
      { method: 'eq', args: ['id', 'c1'] },
      { method: 'select', args: [] },
      { method: 'maybeSingle', args: [] },
    ]);
  });
  it('reads instead of updating when the patch is empty', async () => {
    const f = createFakeSupabase({ tables: { children: { data: row(), error: null } } });
    expect(await new SupabaseChildRepository(f.client).update('c1', {})).toEqual(ana);
    expect(opNames(f.calls[0])).toEqual(['select', 'eq', 'maybeSingle']);
  });
  it('update of a missing or foreign child is NotFoundError', async () => {
    const f = createFakeSupabase({ tables: { children: { data: null, error: null } } });
    await expect(new SupabaseChildRepository(f.client).update('zz', { name: 'x' })).rejects.toBeInstanceOf(NotFoundError);
  });
  it('removes by id and reports NotFoundError when nothing was deleted', async () => {
    const ok = createFakeSupabase({ tables: { children: { data: [{ id: 'c1' }], error: null } } });
    await expect(new SupabaseChildRepository(ok.client).remove('c1')).resolves.toBeUndefined();
    expect(ok.calls[0]?.ops).toEqual([
      { method: 'delete', args: [] },
      { method: 'eq', args: ['id', 'c1'] },
      { method: 'select', args: ['id'] },
    ]);
    const none = createFakeSupabase({ tables: { children: { data: [], error: null } } });
    await expect(new SupabaseChildRepository(none.client).remove('c1')).rejects.toBeInstanceOf(NotFoundError);
  });
  it('maps thrown network failures', async () => {
    const f = createFakeSupabase({
      tables: {
        children: () => {
          throw new TypeError('Failed to fetch');
        },
      },
    });
    await expect(new SupabaseChildRepository(f.client).list()).rejects.toBeInstanceOf(StorageError);
  });
});
