import { AuthError, NotFoundError, ValidationError } from '@/application/errors';
import type { Child } from '@/application/model';
import type { ChildRepository } from '@/application/ports';
import { asRecord } from '../coerce';
import type { PipSupabaseClient } from './client';
import { mapAuthError, mapPostgrestError, mapThrown } from './errors';
import { childFromRow, childPatchToUpdate, childToInsert } from './mappers';

const RESOURCE = 'child';
const MAX_CHILDREN_TEXT = 'at most 8 child profiles';

/** Child profiles stored in `public.children`; RLS limits every query to the signed-in parent. */
export class SupabaseChildRepository implements ChildRepository {
  constructor(private readonly client: PipSupabaseClient) {}

  async list(): Promise<Child[]> {
    try {
      const { data, error } = await this.client.from('children').select('*').order('created_at', { ascending: true });
      if (error) throw mapPostgrestError(error);
      return (data ?? []).map(childFromRow);
    } catch (e) {
      throw mapThrown(e);
    }
  }

  async create(input: Omit<Child, 'id'>): Promise<Child> {
    try {
      const parentId = await this.currentUserId();
      const { data, error } = await this.client.from('children').insert(childToInsert(input, parentId)).select().single();
      if (error) {
        const message = asRecord(error)?.message;
        if (typeof message === 'string' && message.includes(MAX_CHILDREN_TEXT)) {
          throw new ValidationError('A parent can have at most 8 child profiles', { cause: error });
        }
        throw mapPostgrestError(error);
      }
      return childFromRow(data);
    } catch (e) {
      throw mapThrown(e);
    }
  }

  async update(id: string, patch: Partial<Omit<Child, 'id'>>): Promise<Child> {
    try {
      const update = childPatchToUpdate(patch);
      const query =
        Object.keys(update).length === 0
          ? this.client.from('children').select('*').eq('id', id).maybeSingle()
          : this.client.from('children').update(update).eq('id', id).select().maybeSingle();
      const { data, error } = await query;
      if (error) throw mapPostgrestError(error, { resource: RESOURCE });
      if (!data) throw new NotFoundError(`${RESOURCE} not found`);
      return childFromRow(data);
    } catch (e) {
      throw mapThrown(e);
    }
  }

  async remove(id: string): Promise<void> {
    try {
      const { data, error } = await this.client.from('children').delete().eq('id', id).select('id');
      if (error) throw mapPostgrestError(error, { resource: RESOURCE });
      if (!data || data.length === 0) throw new NotFoundError(`${RESOURCE} not found`);
    } catch (e) {
      throw mapThrown(e);
    }
  }

  private async currentUserId(): Promise<string> {
    const { data, error } = await this.client.auth.getSession();
    if (error) throw mapAuthError(error);
    if (!data.session) throw new AuthError('not_signed_in');
    return data.session.user.id;
  }
}
