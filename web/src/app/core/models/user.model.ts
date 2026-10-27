import { Database } from './database.types';

export type UserRole = Database['public']['Enums']['user_role'];

/** The app's view of a user: a row of public.profiles. */
export type User = Pick<Database['public']['Tables']['profiles']['Row'], 'id' | 'email' | 'role'>;

export interface Credentials {
  email: string;
  password: string;
}

export interface SignupPayload extends Credentials {
  password_confirmation: string;
}

export interface Paginated<T> {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
}
