import { Injectable, inject } from '@angular/core';
import { Observable, from } from 'rxjs';
import { AuthService } from './auth.service';
import { SUPABASE, invokeFunction, unwrap } from './supabase';

export interface PasswordChange {
  current_password: string;
  password: string;
  password_confirmation: string;
}

/** Operates on the signed-in user only. */
@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly supabase = inject(SUPABASE);
  private readonly auth = inject(AuthService);

  changePassword({ current_password, password }: PasswordChange): Observable<void> {
    return from(
      (async () => {
        const email = this.auth.user()?.email;
        if (!email) throw new Error('You are not signed in.');
        // Supabase does not check the old password itself, so re-authenticate first.
        const check = await this.supabase.auth.signInWithPassword({ email, password: current_password });
        if (check.error) throw new Error('Current password is incorrect.');
        unwrap(await this.supabase.auth.updateUser({ password }));
      })(),
    );
  }

  deleteAccount(): Observable<void> {
    return from(
      (async () => {
        await invokeFunction(this.supabase, 'delete-account');
        await this.supabase.auth.signOut({ scope: 'local' });
      })(),
    );
  }
}
