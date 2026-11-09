import type { Session } from '../model';

export interface AuthGateway {
  getSession(): Promise<Session | null>;
  signUp(email: string, password: string): Promise<{ session: Session | null; needsEmailConfirmation: boolean }>;
  signIn(email: string, password: string): Promise<Session>;
  signOut(): Promise<void>;
  continueAsGuest(): Promise<Session>;
  onChange(cb: (s: Session | null) => void): () => void;
}
