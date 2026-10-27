import { json, serve } from '../_shared/http.ts';
import { admin, requireUser } from '../_shared/supabase.ts';

/** Deletes the caller's own account. The profile cascades. */
serve(async (req) => {
  const user = await requireUser(req);
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) throw error;
  return json({ deleted: true });
});
