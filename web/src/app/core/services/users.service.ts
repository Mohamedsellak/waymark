import { Injectable, inject } from '@angular/core';
import { Observable, from } from 'rxjs';
import { Paginated, User, UserRole } from '../models/user.model';
import { SUPABASE, invokeFunction } from './supabase';

export interface UserInput {
  email: string;
  role: UserRole;
  password?: string;
}

const PAGE_SIZE = 10;

/** Admin-only. Reads go through RLS; writes go through the `admin-users` Edge Function. */
@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly supabase = inject(SUPABASE);

  list(page = 1): Observable<Paginated<User>> {
    return from(
      (async () => {
        const start = (page - 1) * PAGE_SIZE;
        const { data, error, count } = await this.supabase
          .from('profiles')
          .select('id, email, role', { count: 'exact' })
          .order('created_at', { ascending: true })
          .range(start, start + PAGE_SIZE - 1);
        if (error) throw new Error(error.message);
        const total = count ?? 0;
        return { data: data ?? [], total, current_page: page, last_page: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
      })(),
    );
  }

  create(input: UserInput): Observable<{ id: string }> {
    return from(invokeFunction<{ id: string }>(this.supabase, 'admin-users', { method: 'POST', body: input }));
  }

  update(id: string, input: UserInput): Observable<{ id: string }> {
    return from(invokeFunction<{ id: string }>(this.supabase, 'admin-users', { method: 'PUT', body: { id, ...input } }));
  }

  remove(id: string): Observable<{ id: string }> {
    return from(invokeFunction<{ id: string }>(this.supabase, 'admin-users', { method: 'DELETE', body: { id } }));
  }
}
