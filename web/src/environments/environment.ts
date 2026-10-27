export const environment = {
  production: true,
  /** Supabase project: Settings > API. The publishable/anon key is safe to ship to browsers. */
  supabaseUrl: 'https://wlfjcifccobaflsonzpp.supabase.co',
  supabaseAnonKey: 'sb_publishable_oMYuovbZYSJ9grTQySHbWg_sZXZ457R',
  /** Flask / OR-Tools solver service. */
  solverUrl: 'https://solver.example.com', // replace with your deployed solver URL
  /** Road geometry, distance and drive time per route (OSRM). The public demo server is for light use only. */
  osrmUrl: 'https://router.project-osrm.org',
  /** Address search (Nominatim). Public instance: max 1 request/second. */
  geocoderUrl: 'https://nominatim.openstreetmap.org',
};
