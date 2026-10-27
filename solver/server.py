"""Waymark solver API.

POST /<problem>   problem in tsp | vrp | cvrp | vrptw
  body: {
    "locations": [{"lat", "lng", "label"?}, ...]   # index 0 is the depot
    "vehicles": int                                # vrp, cvrp, vrptw
    "demands": [int, ...]                          # cvrp, one per location
    "capacities": [int, ...]                       # cvrp, one per vehicle
    "time_windows": [[start, end], ...]            # vrptw, minutes since midnight
    "service_minutes": int                         # vrptw, optional
  }
  200: {"problem", "matrix": "road"|"straight", "routes": [{"vehicle", "distance_m", "duration_s",
        "load"?, "stops": [{"index", "lat", "lng", "label", "demand"?, "window"?, "arrival"?}]}]}
  400 invalid input, 401/403 auth, 422 no feasible plan, 429 rate limited.
GET /health
"""
import logging
import os
import time

from flask import Flask, jsonify, request
from flask_cors import CORS

import matrix
import solver
from auth import require_solver_access
from validation import PROBLEMS, ValidationError, parse

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("waymark")

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 512 * 1024
app.json.sort_keys = False

# Comma-separated list of frontend origins allowed to call the solver.
ALLOWED_ORIGINS = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "http://localhost:4200").split(",") if o.strip()]
CORS(app, origins=ALLOWED_ORIGINS, methods=["POST", "GET"], allow_headers=["Authorization", "Content-Type"], max_age=600)


def error(message, status, field=None):
    body = {"error": message}
    if field:
        body["field"] = field
    return jsonify(body), status


@app.get("/")
@app.get("/health")
def health():
    return jsonify({"status": "ok", "service": "waymark-solver"})


@app.post("/<problem_type>")
@require_solver_access
def solve(problem_type):
    if problem_type not in PROBLEMS:
        return error(f"Unknown problem type '{problem_type}'.", 404)

    payload = request.get_json(silent=True)
    if payload is None:
        return error("Send the plan as a JSON body.", 400)

    try:
        problem = parse(problem_type, payload)
    except ValidationError as exc:
        return error(exc.message, 400, exc.field)

    started = time.monotonic()
    try:
        dist, dur, source = matrix.build(problem.locations)
        routes = solver.solve(problem, dist, dur)
    except solver.Infeasible as exc:
        return error(str(exc), 422)
    except Exception:
        log.exception("solve failed (%s, %d locations)", problem_type, len(problem.locations))
        return error("The solver hit an unexpected problem. Try again.", 500)

    log.info("solved %s: %d locations, %d vehicles, %s matrix, %.2fs",
             problem_type, len(problem.locations), problem.vehicles, source, time.monotonic() - started)
    return jsonify({"problem": problem_type, "matrix": source, "routes": [_route(problem, r) for r in routes]})


def _route(problem, route):
    stops = []
    for k, node in enumerate(route["nodes"]):
        loc = problem.locations[node]
        stop = {"index": node, "lat": loc.lat, "lng": loc.lng, "label": loc.label}
        if problem.kind == "cvrp":
            stop["demand"] = problem.demands[node]
        if problem.kind == "vrptw":
            stop["window"] = list(problem.time_windows[node])
            stop["arrival"] = route["arrivals"][k]
        stops.append(stop)
    out = {"vehicle": route["vehicle"], "distance_m": route["distance_m"], "duration_s": route["duration_s"], "stops": stops}
    if problem.kind == "cvrp":
        out["load"] = sum(problem.demands[n] for n in route["nodes"])
    return out


@app.errorhandler(413)
def too_large(_):
    return error("The plan is too large to send in one request.", 413)


@app.errorhandler(405)
def wrong_method(_):
    return error("Use POST to solve a plan.", 405)


if __name__ == "__main__":
    # Development only. Production: gunicorn -c gunicorn.conf.py server:app
    # Never enable debug on a public interface: the Werkzeug debugger allows code execution.
    app.run(host="127.0.0.1", port=int(os.environ.get("PORT", "5000")), debug=os.environ.get("FLASK_DEBUG") == "1")
