# Waymark – Angular frontend

Angular 22 + TypeScript single-page app for Waymark. It talks to:

| Backend | Env key | Purpose |
|---|---|---|
| Supabase (`../supabase`) | `supabaseUrl`, `supabaseAnonKey` | auth, `profiles` table, admin Edge Functions |
| Flask / OR-Tools service (`../solver`) | `solverUrl` | TSP, VRP, CVRP, VRPTW solving |

Settings live in `src/environments/environment*.ts`. The publishable key is meant to be public;
never put the secret / service-role key in this app.

```bash
npm install
npm start          # http://localhost:4200 (uses environment.development.ts)
npm test           # Vitest unit tests
npm run build      # production build → dist/waymark
```

## Architecture

```
src/app
├── core/                    App-wide, framework-level code. No UI.
│   ├── models/              Types + PROBLEMS config (single source of truth per problem)
│   ├── services/            Supabase client + auth, profile, users services
│   ├── guards/              authGuard, guestGuard, adminGuard
│   ├── interceptors/        Adds the Supabase access token to solver requests
│   └── utils/               errorMessage() for Supabase/Flask errors
├── shared/                  Reusable, dumb UI and helpers (404 page, route colours)
├── layout/                  Shell: top bar + <router-outlet>
├── features/                One folder per screen, all lazy-loaded
│   ├── landing/  home/  auth/  profile/  admin/
│   └── solver/
│       ├── data-access/     SolverStore (plan state), SolverService (solver API), road router (OSRM),
│       │                    geocoder (Nominatim), sample data
│       ├── components/      RouteMap, AddressSearch, MapLegend, PlanPanel, ResultsPanel
│       └── solver-page.*    One workspace for all 4 problems, driven by route data
├── app.routes.ts            Route tree + guards
└── app.config.ts            Providers: router, HttpClient, session restore
```

Rules of thumb:

- **Dependencies point inwards:** `features → shared → core`. Core never imports a feature.
- **Components hold state in signals; services do I/O.** Stateful services: `AuthService` (current user),
  `SolverStore` (the plan being edited, saved in localStorage) and `ThemeService`.
- **`SolverService` is the only code that knows the solver's wire format** (`data-access/solver.api.ts`);
  the rest of the app uses the `Solution` type. Time windows are minutes since midnight everywhere.
- **Adding a problem type** means: add it to `ProblemType` + `PROBLEMS`, extend `SolverService.toBody`,
  and support it in the solver. Routes, the home page and the landing page pick it up automatically.
- Path aliases: `@core/*`, `@shared/*`, `@features/*`, `@env/*`.

## Backend (Supabase)

- **Auth:** Supabase Auth (email + password). A trigger creates a `public.profiles` row
  (`id, email, role`) for every new user.
- **Reads:** straight from the browser, filtered by Row Level Security: users see their own
  profile, admins see all.
- **Writes:** clients have no write access. Admin user management (`admin-users`) and
  account deletion (`delete-account`) run as Edge Functions with the service role.
- **Solver access:** Angular sends the Supabase access token to Flask. Flask calls
  `rpc/has_solver_access` with it, so Supabase checks the token. No JWT secret lives in Flask.

First deploy:

```bash
npx supabase login
npx supabase link --project-ref wlfjcifccobaflsonzpp
npx supabase db push                       # applies supabase/migrations
npx supabase functions deploy admin-users
npx supabase functions deploy delete-account
npx supabase secrets set ALLOWED_ORIGIN=http://localhost:4200
```

Make yourself admin (SQL editor): `update public.profiles set role = 'Admin' where email = 'you@example.com';`
