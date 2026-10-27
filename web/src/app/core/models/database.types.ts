/**
 * Database types for supabase-js. Mirrors supabase/migrations.
 * Regenerate after schema changes:
 *   npx supabase gen types typescript --local > frontend/src/app/core/models/database.types.ts
 */
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          role: Database['public']['Enums']['user_role'];
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      has_solver_access: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: {
      user_role: 'Admin' | 'User';
    };
    CompositeTypes: Record<never, never>;
  };
}
