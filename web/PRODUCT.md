# Waymark

Route planning for dispatchers and small delivery fleets. Users place a depot and stops on a map
(click, address search, or CSV), describe the fleet, and get optimised routes (Google OR-Tools via the
Flask solver), drawn on real roads (OSRM).

- **Audience:** dispatchers and small fleet operators planning real daily routes. Speed and clarity first.
- **Problems:** TSP, VRP, CVRP (capacity + demand), VRPTW (delivery windows).
- **Surfaces:** landing (persuade), planner workspace (operate), problem picker, auth, account, admin users.
- **Backend:** Supabase auth + `profiles` (role Admin/User); solver access requires a signed-in user.
