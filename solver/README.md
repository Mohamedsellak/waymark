# Waymark solver service

Flask + Google OR-Tools. One validated endpoint per problem type; callers must send a Supabase
access token (checked against `rpc/has_solver_access`).

## Run

```bash
python3 -m venv venv && venv/bin/pip install -r requirements.txt
cp .env.example .env   # fill in SUPABASE_URL and SUPABASE_ANON_KEY
set -a && . ./.env && set +a
venv/bin/python server.py                        # development, 127.0.0.1:5000
venv/bin/gunicorn -c gunicorn.conf.py server:app # production
venv/bin/python -m unittest discover -s tests -t .
```

## API

`POST /tsp | /vrp | /cvrp | /vrptw` with `Authorization: Bearer <supabase access token>`

```jsonc
{
  "locations": [{ "lat": 33.6, "lng": -7.53, "label": "Depot" }, ...], // index 0 = depot, 2–150 entries
  "vehicles": 3,                       // vrp, cvrp, vrptw (1–50)
  "demands": [0, 3, 2],                // cvrp, one per location (depot ignored)
  "capacities": [12, 12, 12],          // cvrp, one per vehicle
  "time_windows": [[420, 1140], ...],  // vrptw, minutes since midnight, one per location
  "service_minutes": 5                 // vrptw, time spent at each stop (0–240)
}
```

`200` → `{ problem, matrix: "road"|"straight", routes: [{ vehicle, distance_m, duration_s, load?, stops: [{ index, lat, lng, label, demand?, window?, arrival? }] }] }`

| Status | Meaning |
|---|---|
| 400 | Invalid input; body `{ error, field }` names what to fix |
| 401 / 403 | Missing or expired token / account not allowed |
| 422 | No plan satisfies the constraints (capacity or time windows) |
| 429 | More than `SOLVES_PER_MINUTE` solves per user |

`GET /health` → `{ "status": "ok" }`

## How it solves

- **Matrix:** road distances and drive times from the OSRM table service (`OSRM_URL`), falling back to
  straight-line × 1.3 at 40 km/h when OSRM is unreachable. Values are metres and seconds.
- **Model:** one OR-Tools routing model. VRP adds a span cost to balance route lengths, CVRP a capacity
  dimension, VRPTW a time dimension (waiting allowed, service time, earliest arrivals reported, idle
  time penalised). Search: path-cheapest-arc then guided local search, 1–10 s depending on size.
- Address labels come from the client; this service does no geocoding.
