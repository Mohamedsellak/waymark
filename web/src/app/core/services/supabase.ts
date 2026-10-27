import { InjectionToken } from '@angular/core';
import { FunctionsHttpError, SupabaseClient, createClient } from '@supabase/supabase-js';
import { environment } from '@env/environment';
import { Database } from '../models/database.types';

export type Supabase = SupabaseClient<Database>;

/** The single Supabase client. It stores and refreshes the session itself. */
export const SUPABASE = new InjectionToken<Supabase>('SUPABASE', {
  providedIn: 'root',
  factory: () => createClient<Database>(environment.supabaseUrl, environment.supabaseAnonKey),
});

type Result = { data: unknown; error: { message: string } | null };

/** Throws a supabase-js `{ error }` result as an Error, otherwise returns its (success-typed) data. */
export function unwrap<R extends Result>(result: R): Extract<R, { error: null }>['data'] {
  if (result.error) throw new Error(result.error.message);
  return result.data as Extract<R, { error: null }>['data'];
}

/**
 * Calls an Edge Function and surfaces its `{ error }` body as the Error message
 * (supabase-js otherwise only reports "non-2xx status code").
 */
export async function invokeFunction<T>(
  client: Supabase,
  name: string,
  options: { method?: 'POST' | 'PUT' | 'DELETE'; body?: object } = {},
): Promise<T> {
  const { data, error } = await client.functions.invoke<T>(name, { method: options.method ?? 'POST', body: options.body ?? {} });
  if (error instanceof FunctionsHttpError) {
    const body = await error.context.json().catch(() => null);
    throw new Error(body?.error ?? error.message);
  }
  if (error) throw new Error(error.message);
  return data as T;
}
