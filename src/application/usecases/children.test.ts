import { describe, expect, it } from 'vitest';
import { NotFoundError, ValidationError } from '../errors';
import { createTestDeps } from '../testing';
import { createChild } from './createChild';
import { listChildren } from './listChildren';
import { removeChild } from './removeChild';
import { updateChild } from './updateChild';

describe('createChild', () => {
  it('trims the name and defaults sound to on', async () => {
    const { deps } = createTestDeps();
    const child = await createChild(deps, { name: '  Ana  ', grade: 3, locale: 'es' });
    expect(child).toMatchObject({ name: 'Ana', grade: 3, locale: 'es', soundEnabled: true });
    expect(await listChildren(deps)).toEqual([child]);
  });
  it('keeps an explicit soundEnabled value', async () => {
    const { deps } = createTestDeps();
    const child = await createChild(deps, { name: 'Ana', grade: 1, locale: 'en', soundEnabled: false });
    expect(child.soundEnabled).toBe(false);
  });
  it('accepts names of 1 and 24 characters', async () => {
    const { deps } = createTestDeps();
    await expect(createChild(deps, { name: 'A', grade: 1, locale: 'en' })).resolves.toBeDefined();
    await expect(createChild(deps, { name: 'x'.repeat(24), grade: 6, locale: 'en' })).resolves.toBeDefined();
  });
  it.each([
    ['empty name', { name: '', grade: 1, locale: 'en' }],
    ['blank name', { name: '   ', grade: 1, locale: 'en' }],
    ['25 characters', { name: 'x'.repeat(25), grade: 1, locale: 'en' }],
    ['grade 0', { name: 'Ana', grade: 0, locale: 'en' }],
    ['grade 7', { name: 'Ana', grade: 7, locale: 'en' }],
    ['fractional grade', { name: 'Ana', grade: 2.5, locale: 'en' }],
    ['unknown locale', { name: 'Ana', grade: 2, locale: 'fr' }],
  ])('rejects %s', async (_label, input) => {
    const { deps } = createTestDeps();
    await expect(createChild(deps, input as never)).rejects.toBeInstanceOf(ValidationError);
    expect(await listChildren(deps)).toEqual([]);
  });
});

describe('updateChild', () => {
  it('applies a validated patch', async () => {
    const { deps } = createTestDeps();
    const child = await createChild(deps, { name: 'Ana', grade: 1, locale: 'en' });
    const updated = await updateChild(deps, child.id, { name: ' Anita ', grade: 2, soundEnabled: false });
    expect(updated).toMatchObject({ id: child.id, name: 'Anita', grade: 2, soundEnabled: false, locale: 'en' });
  });
  it('rejects invalid fields and empty patches', async () => {
    const { deps } = createTestDeps();
    const child = await createChild(deps, { name: 'Ana', grade: 1, locale: 'en' });
    await expect(updateChild(deps, child.id, { name: '' })).rejects.toBeInstanceOf(ValidationError);
    await expect(updateChild(deps, child.id, { grade: 9 as never })).rejects.toBeInstanceOf(ValidationError);
    await expect(updateChild(deps, child.id, { locale: 'xx' as never })).rejects.toBeInstanceOf(ValidationError);
    await expect(updateChild(deps, child.id, {})).rejects.toBeInstanceOf(ValidationError);
  });
  it('throws NotFoundError for another parent child or unknown id', async () => {
    const { deps } = createTestDeps();
    await expect(updateChild(deps, 'nope', { name: 'X' })).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('removeChild', () => {
  it('removes the child', async () => {
    const { deps } = createTestDeps();
    const child = await createChild(deps, { name: 'Ana', grade: 1, locale: 'en' });
    await removeChild(deps, child.id);
    expect(await listChildren(deps)).toEqual([]);
  });
  it('throws NotFoundError when it does not exist', async () => {
    const { deps } = createTestDeps();
    await expect(removeChild(deps, 'nope')).rejects.toBeInstanceOf(NotFoundError);
  });
});
