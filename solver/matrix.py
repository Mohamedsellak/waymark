"""Travel distance (metres) and time (seconds) between every pair of locations.

Uses the OSRM table service for real road values and falls back to a
straight-line estimate when OSRM is unreachable or a pair has no road route.
"""
import logging
import math
import os

import requests

log = logging.getLogger(__name__)

OSRM_URL = os.environ.get("OSRM_URL", "https://router.project-osrm.org").rstrip("/")
OSRM_MAX = int(os.environ.get("OSRM_MAX_LOCATIONS", "100"))
DETOUR = 1.3        # roads are rarely straight
FALLBACK_KMH = 40   # assumed urban average speed


def haversine_m(a, b):
    lat1, lng1, lat2, lng2 = map(math.radians, (a.lat, a.lng, b.lat, b.lng))
    h = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lng2 - lng1) / 2) ** 2
    return 2 * 6_371_000 * math.asin(math.sqrt(h))


def _estimate(a, b):
    metres = haversine_m(a, b) * DETOUR
    return int(round(metres)), int(round(metres / (FALLBACK_KMH / 3.6)))


def _osrm(locations):
    coords = ";".join(f"{l.lng:.6f},{l.lat:.6f}" for l in locations)
    res = requests.get(
        f"{OSRM_URL}/table/v1/driving/{coords}",
        params={"annotations": "distance,duration"},
        timeout=10,
    )
    res.raise_for_status()
    body = res.json()
    if body.get("code") != "Ok":
        raise RuntimeError(body.get("message", "OSRM error"))
    return body["distances"], body["durations"]


def build(locations):
    """Returns (distances_m, durations_s, source) where source is 'road' or 'straight'."""
    n = len(locations)
    dist = [[0] * n for _ in range(n)]
    dur = [[0] * n for _ in range(n)]

    road = None
    if n <= OSRM_MAX:
        try:
            road = _osrm(locations)
        except Exception as exc:  # network, HTTP or payload problems all mean "use the estimate"
            log.warning("OSRM table unavailable, using straight-line estimate: %s", exc)

    for i in range(n):
        for j in range(n):
            if i == j:
                continue
            d = t = None
            if road:
                d, t = road[0][i][j], road[1][i][j]
            if d is None or t is None:
                d, t = _estimate(locations[i], locations[j])
            dist[i][j], dur[i][j] = int(round(d)), int(round(t))
    return dist, dur, "road" if road else "straight"
