export const environment = {
  production: false,
  /** Hosted project. For a local stack use http://127.0.0.1:54321 and the key from `npx supabase status`. */
  supabaseUrl: 'https://wlfjcifccobaflsonzpp.supabase.co',
  supabaseAnonKey: 'sb_publishable_oMYuovbZYSJ9grTQySHbWg_sZXZ457R',
  solverUrl: 'http://127.0.0.1:5000',
  /** Road geometry, distance and drive time per route (OSRM). The public demo server is for light use only. */
  osrmUrl: 'https://router.project-osrm.org',
  /** Address search (Nominatim). Public instance: max 1 request/second. */
  geocoderUrl: 'https://nominatim.openstreetmap.org',
};
