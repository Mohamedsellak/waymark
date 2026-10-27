# Waymark

Delivery route planning for dispatchers and small fleets: place a depot and stops on a map, describe the
fleet, and get optimised routes (TSP, VRP, capacitated VRP, VRP with time windows) drawn on real roads.

| Folder | What | Docs |
|---|---|---|
| `web/` | Angular 22 app (planner, auth, admin) | `web/README.md`, `web/DESIGN.md` |
| `solver/` | Flask + Google OR-Tools routing API | `solver/README.md` |
| `supabase/` | Auth, `profiles` table + RLS, admin Edge Functions | migrations in `supabase/migrations` |

## Run locally

```bash
# 1. Solver (terminal 1)
cd solver
python3 -m venv venv && venv/bin/pip install -r requirements.txt   # first time
cp .env.example .env                                               # first time: Supabase URL + publishable key
set -a && . ./.env && set +a && venv/bin/python server.py           # http://127.0.0.1:5000

# 2. Web app (terminal 2)
cd web && npm install && npm start                                  # http://localhost:4200
```

Supabase: `npx supabase link --project-ref <ref>`, then `npx supabase db push` and
`npx supabase functions deploy admin-users` / `delete-account` (run from this folder).
