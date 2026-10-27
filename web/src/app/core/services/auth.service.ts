import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, from } from 'rxjs';
import { Credentials, SignupPayload, User } from '../models/user.model';
import { SUPABASE, unwrap } from './supabase';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SUPABASE);

  private readonly _user = signal<User | null>(null);

  readonly user = this._user.asReadonly();
  readonly isLoggedIn = computed(() => this._user() !== null);
  readonly isAdmin = computed(() => this._user()?.role === 'Admin');

  constructor() {
    // Keeps the app in sync with sign-outs from other tabs and expired refresh tokens.
    this.supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') this._user.set(null);
    });
  }

  /** Current access token, used to call the solver service. */
  async accessToken(): Promise<string | null> {
    const { data } = await this.supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  /** Restores the session on startup. Never throws: a broken session just means logged out. */
  async restore(): Promise<void> {
    try {
      const { data } = await this.supabase.auth.getSession();
      if (data.session) await this.loadProfile(data.session.user.id);
    } catch {
      this._user.set(null);
    }
  }

  login({ email, password }: Credentials): Observable<User> {
    return from(
      (async () => {
        const { user } = unwrap(await this.supabase.auth.signInWithPassword({ email, password }));
        return this.loadProfile(user.id);
      })(),
    );
  }

  /** Resolves to the user, or `null` when Supabase requires email confirmation first. */
  signup({ email, password }: SignupPayload): Observable<User | null> {
    return from(
      (async () => {
        const { session } = unwrap(await this.supabase.auth.signUp({ email, password }));
        return session ? this.loadProfile(session.user.id) : null;
      })(),
    );
  }

  logout(): Observable<void> {
    return from(
      (async () => {
        await this.supabase.auth.signOut();
        this._user.set(null);
      })(),
    );
  }

  clear(): void {
    this._user.set(null);
  }

  private async loadProfile(id: string): Promise<User> {
    const profile = unwrap(
      await this.supabase.from('profiles').select('id, email, role').eq('id', id).single(),
    );
    this._user.set(profile);
    return profile;
  }
}
