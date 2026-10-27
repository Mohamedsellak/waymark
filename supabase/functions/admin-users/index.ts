import { HttpError, json, readJson, serve } from '../_shared/http.ts';
import { admin, requireAdmin } from '../_shared/supabase.ts';

type Role = 'Admin' | 'User';

interface Body {
  id?: string;
  email?: string;
  password?: string;
  role?: Role;
}

const ROLES: Role[] = ['Admin', 'User'];

function validate({ email, password, role }: Body, creating: boolean): void {
  if (creating && !email) throw new HttpError(422, 'Email is required');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(422, 'Email is invalid');
  if (creating && !password) throw new HttpError(422, 'Password is required');
  if (password && password.length < 8) throw new HttpError(422, 'Password must be at least 8 characters');
  if (role && !ROLES.includes(role)) throw new HttpError(422, 'Role must be Admin or User');
}

async function setRole(id: string, role: Role | undefined): Promise<void> {
  if (!role) return;
  const { error } = await admin.from('profiles').update({ role }).eq('id', id);
  if (error) throw error;
}

/** Admin user management. POST creates, PUT updates, DELETE removes (all take `id` in the body). */
serve(async (req) => {
  const caller = await requireAdmin(req);
  const body = await readJson<Body>(req);

  switch (req.method) {
    case 'POST': {
      validate(body, true);
      const { data, error } = await admin.auth.admin.createUser({
        email: body.email,
        password: body.password,
        email_confirm: true,
      });
      if (error) throw new HttpError(422, error.message);
      await setRole(data.user.id, body.role);
      return json({ id: data.user.id }, 201);
    }

    case 'PUT': {
      if (!body.id) throw new HttpError(400, 'Missing user id');
      validate(body, false);
      if (body.id === caller.id && body.role === 'User') throw new HttpError(422, 'You cannot remove your own admin role');

      const changes: { email?: string; password?: string } = {};
      if (body.email) changes.email = body.email;
      if (body.password) changes.password = body.password;
      if (Object.keys(changes).length) {
        const { error } = await admin.auth.admin.updateUserById(body.id, { ...changes, email_confirm: true });
        if (error) throw new HttpError(422, error.message);
      }
      await setRole(body.id, body.role);
      return json({ id: body.id });
    }

    case 'DELETE': {
      if (!body.id) throw new HttpError(400, 'Missing user id');
      if (body.id === caller.id) throw new HttpError(422, 'Use your profile page to delete your own account');
      const { error } = await admin.auth.admin.deleteUser(body.id);
      if (error) throw new HttpError(422, error.message);
      return json({ id: body.id });
    }

    default:
      throw new HttpError(405, 'Method not allowed');
  }
});
