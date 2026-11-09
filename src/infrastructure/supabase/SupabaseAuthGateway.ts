import { AuthError } from '@/application/errors';
import type { Session } from '@/application/model';
import type { AuthGateway } from '@/application/ports';
import type { PipSupabaseClient } from './client';
import { mapAuthError, mapThrown } from './errors';

interface Options {
  /** Where the confirmation e-mail link sends the parent back to (usually `window.location.origin`). */
  emailRedirectTo?: string;
}

type AuthSession = { user: { id: string; email?: string | null } };

function toSession(s: AuthSession | null | undefined): Session | null {
  return s ? { userId: s.user.id, email: s.user.email ?? null, guest: false } : null;
}

/** Parent accounts through Supabase Auth (e-mail and password). */
export class SupabaseAuthGateway implements AuthGateway {
  constructor(
    private readonly client: Pick<PipSupabaseClient, 'auth'>,
    private readonly options: Options = {},
  ) {}

  async getSession(): Promise<Session | null> {
    try {
      const { data, error } = await this.client.auth.getSession();
      if (error) throw mapAuthError(error);
      return toSession(data.session);
    } catch (e) {
      throw mapThrown(e);
    }
  }

  async signUp(email: string, password: string): Promise<{ session: Session | null; needsEmailConfirmation: boolean }> {
    try {
      const { data, error } = await this.client.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: this.options.emailRedirectTo },
      });
      if (error) throw mapAuthError(error);
      // With e-mail confirmation on, an already registered address returns a user with no identities.
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        throw new AuthError('email_taken');
      }
      const session = toSession(data.session);
      return { session, needsEmailConfirmation: session === null };
    } catch (e) {
      throw mapThrown(e);
    }
  }

  async signIn(email: string, password: string): Promise<Session> {
    try {
      const { data, error } = await this.client.auth.signInWithPassword({ email, password });
      if (error) throw mapAuthError(error);
      const session = toSession(data.session);
      if (!session) throw new AuthError('auth_failed');
      return session;
    } catch (e) {
      throw mapThrown(e);
    }
  }

  async signOut(): Promise<void> {
    try {
      const { error } = await this.client.auth.signOut();
      if (error) throw mapAuthError(error);
    } catch (e) {
      throw mapThrown(e);
    }
  }

  async continueAsGuest(): Promise<Session> {
    throw new AuthError('guest_unavailable');
  }

  onChange(cb: (s: Session | null) => void): () => void {
    const { data } = this.client.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED') return;
      cb(toSession(session));
    });
    return () => data.subscription.unsubscribe();
  }
}
