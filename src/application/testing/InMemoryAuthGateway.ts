import { AuthError } from '../errors';
import type { Session } from '../model';
import type { AuthGateway } from '../ports';

const MIN_PASSWORD = 6;

interface Options {
  /** When true, sign up creates the account but returns no session (email must be confirmed). */
  requireEmailConfirmation?: boolean;
}

/** In-memory AuthGateway with a fake user store and onChange listeners. */
export class InMemoryAuthGateway implements AuthGateway {
  private readonly users = new Map<string, { password: string; userId: string }>();
  private readonly listeners = new Set<(s: Session | null) => void>();
  private session: Session | null = null;
  private counter = 0;

  constructor(private readonly options: Options = {}) {}

  async getSession(): Promise<Session | null> {
    return this.session;
  }

  async signUp(email: string, password: string): Promise<{ session: Session | null; needsEmailConfirmation: boolean }> {
    const key = email.trim().toLowerCase();
    if (this.users.has(key)) throw new AuthError('An account with this email already exists');
    if (password.length < MIN_PASSWORD) throw new AuthError('Password is too short');
    const userId = `user-${++this.counter}`;
    this.users.set(key, { password, userId });
    if (this.options.requireEmailConfirmation) return { session: null, needsEmailConfirmation: true };
    const session: Session = { userId, email: key, guest: false };
    this.setSession(session);
    return { session, needsEmailConfirmation: false };
  }

  async signIn(email: string, password: string): Promise<Session> {
    const key = email.trim().toLowerCase();
    const user = this.users.get(key);
    if (!user || user.password !== password) throw new AuthError('Invalid email or password');
    const session: Session = { userId: user.userId, email: key, guest: false };
    this.setSession(session);
    return session;
  }

  async signOut(): Promise<void> {
    this.setSession(null);
  }

  async continueAsGuest(): Promise<Session> {
    const session: Session = { userId: 'guest', email: null, guest: true };
    this.setSession(session);
    return session;
  }

  onChange(cb: (s: Session | null) => void): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private setSession(session: Session | null): void {
    this.session = session;
    for (const cb of [...this.listeners]) cb(session);
  }
}
