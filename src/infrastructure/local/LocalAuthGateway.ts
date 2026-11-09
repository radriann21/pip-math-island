import { AuthError } from '@/application/errors';
import type { Session } from '@/application/model';
import type { AuthGateway } from '@/application/ports';
import type { KeyValueStorage } from './KeyValueStorage';
import { MODE_KEY } from './keys';

const GUEST: Session = { userId: 'guest', email: null, guest: true };

/** Guest-only auth: there are no accounts, just a persisted "continue as guest" flag. */
export class LocalAuthGateway implements AuthGateway {
  private readonly listeners = new Set<(s: Session | null) => void>();
  /** Keeps the guest session alive for this page load even if the storage refuses writes. */
  private guestInMemory = false;

  constructor(private readonly storage: KeyValueStorage) {}

  async getSession(): Promise<Session | null> {
    return this.guestInMemory || this.readFlag() ? { ...GUEST } : null;
  }

  async signUp(email: string, password: string): Promise<{ session: Session | null; needsEmailConfirmation: boolean }> {
    void [email, password];
    throw new AuthError('cloud_unavailable');
  }

  async signIn(email: string, password: string): Promise<Session> {
    void [email, password];
    throw new AuthError('cloud_unavailable');
  }

  async signOut(): Promise<void> {
    this.guestInMemory = false;
    try {
      this.storage.removeItem(MODE_KEY);
    } catch {
      // Nothing to clear if storage is unavailable.
    }
    this.notify(null);
  }

  async continueAsGuest(): Promise<Session> {
    this.guestInMemory = true;
    try {
      this.storage.setItem(MODE_KEY, 'guest');
    } catch {
      // The session still works for this page load.
    }
    const session = { ...GUEST };
    this.notify(session);
    return session;
  }

  onChange(cb: (s: Session | null) => void): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private readFlag(): boolean {
    try {
      return this.storage.getItem(MODE_KEY) === 'guest';
    } catch {
      return false;
    }
  }

  private notify(session: Session | null): void {
    for (const cb of [...this.listeners]) cb(session);
  }
}
