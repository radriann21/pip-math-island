import type { Child } from '../model';

export interface ChildRepository {
  list(): Promise<Child[]>;
  create(input: Omit<Child, 'id'>): Promise<Child>;
  update(id: string, patch: Partial<Omit<Child, 'id'>>): Promise<Child>;
  remove(id: string): Promise<void>;
}
