import { NotFoundError } from '../errors';
import type { Child } from '../model';
import type { ChildRepository } from '../ports';

/** In-memory ChildRepository. Returns copies so callers cannot mutate storage. */
export class InMemoryChildRepository implements ChildRepository {
  private readonly items = new Map<string, Child>();
  private counter = 0;

  async list(): Promise<Child[]> {
    return [...this.items.values()].map((c) => ({ ...c }));
  }

  async create(input: Omit<Child, 'id'>): Promise<Child> {
    const child: Child = { ...input, id: `child-${++this.counter}` };
    this.items.set(child.id, child);
    return { ...child };
  }

  async update(id: string, patch: Partial<Omit<Child, 'id'>>): Promise<Child> {
    const current = this.items.get(id);
    if (!current) throw new NotFoundError(`child ${id} not found`);
    const next: Child = { ...current, ...patch, id };
    this.items.set(id, next);
    return { ...next };
  }

  async remove(id: string): Promise<void> {
    if (!this.items.delete(id)) throw new NotFoundError(`child ${id} not found`);
  }

  /** Test helper (not part of the port): look a child up synchronously. */
  find(id: string): Child | undefined {
    const child = this.items.get(id);
    return child ? { ...child } : undefined;
  }
}
