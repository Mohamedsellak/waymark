import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2';
import { HttpError } from './http.ts';

const url = Deno.env.get('SUPABASE_URL')!;

/** Service-role client: bypasses RLS. Only use after checking who the caller is. */
export const admin: SupabaseClient = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Returns the authenticated caller or throws 401. */
export async function requireUser(req: Request): Promise<User> {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) throw new HttpError(401, 'Missing access token');

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, 'Invalid or expired session');
  return data.user;
}

/** Returns the authenticated caller if they are an Admin, otherwise throws 403. */
export async function requireAdmin(req: Request): Promise<User> {
  const user = await requireUser(req);
  const { data } = await admin.from('profiles').select('role').eq('id', user.id).single();
  if (data?.role !== 'Admin') throw new HttpError(403, 'Admins only');
  return user;
}
