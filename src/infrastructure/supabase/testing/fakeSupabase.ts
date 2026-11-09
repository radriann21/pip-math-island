import type { PipSupabaseClient } from '../client';

export interface RecordedOp {
  method: string;
  args: unknown[];
}
export interface RecordedCall {
  table: string;
  ops: RecordedOp[];
}
export interface FakeResult {
  data: unknown;
  error: unknown;
}
export type TableResponder = FakeResult | ((call: RecordedCall) => FakeResult);

const EMPTY: FakeResult = { data: [], error: null };

class FakeQuery implements PromiseLike<FakeResult> {
  constructor(
    private readonly call: RecordedCall,
    private readonly respond: () => FakeResult,
  ) {}

  then<A = FakeResult, B = never>(
    onfulfilled?: ((value: FakeResult) => A | PromiseLike<A>) | null,
    onrejected?: ((reason: unknown) => B | PromiseLike<B>) | null,
  ): PromiseLike<A | B> {
    return Promise.resolve(this.respond()).then(onfulfilled, onrejected);
  }

  private record(method: string, args: unknown[]): this {
    this.call.ops.push({ method, args });
    return this;
  }
  select = (...a: unknown[]) => this.record('select', a);
  insert = (...a: unknown[]) => this.record('insert', a);
  update = (...a: unknown[]) => this.record('update', a);
  delete = (...a: unknown[]) => this.record('delete', a);
  eq = (...a: unknown[]) => this.record('eq', a);
  order = (...a: unknown[]) => this.record('order', a);
  limit = (...a: unknown[]) => this.record('limit', a);
  single = (...a: unknown[]) => this.record('single', a);
  maybeSingle = (...a: unknown[]) => this.record('maybeSingle', a);
}

export interface FakeSupabaseOptions {
  /** Result per table; a function sees the operations recorded for that query. Defaults to `{ data: [], error: null }`. */
  tables?: Record<string, TableResponder>;
  /** Result per RPC name. Defaults to `{ data: null, error: null }`. */
  rpc?: Record<string, FakeResult>;
  /** Value returned by `auth.getSession()`. Defaults to a signed-in parent `parent-1`. */
  session?: { user: { id: string; email?: string } } | null;
}

/** A hand-written stand-in for the Supabase client that records every call. No network. */
export function createFakeSupabase(options: FakeSupabaseOptions = {}) {
  const calls: RecordedCall[] = [];
  const rpcCalls: Array<{ name: string; args: unknown }> = [];
  const session = options.session === undefined ? { user: { id: 'parent-1', email: 'p@x.co' } } : options.session;
  const raw = {
    from(table: string) {
      const call: RecordedCall = { table, ops: [] };
      calls.push(call);
      const responder = options.tables?.[table] ?? EMPTY;
      return new FakeQuery(call, () => (typeof responder === 'function' ? responder(call) : responder));
    },
    rpc(name: string, args: unknown) {
      rpcCalls.push({ name, args });
      const result = options.rpc?.[name] ?? { data: null, error: null };
      return Promise.resolve(result);
    },
    auth: {
      getSession: () => Promise.resolve({ data: { session }, error: null }),
    },
  };
  return { client: raw as unknown as PipSupabaseClient, calls, rpcCalls };
}

/** The recorded operation names of a call, e.g. `['select', 'eq', 'single']`. */
export const opNames = (call: RecordedCall | undefined): string[] => (call?.ops ?? []).map((o) => o.method);
