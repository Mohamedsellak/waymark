"""Request validation. Turns untrusted JSON into a typed `Problem` or raises ValidationError."""
import math
import os
from dataclasses import dataclass, field

PROBLEMS = ("tsp", "vrp", "cvrp", "vrptw")
MAX_LOCATIONS = int(os.environ.get("MAX_LOCATIONS", "150"))
MAX_VEHICLES = 50
MAX_QUANTITY = 1_000_000
DAY_MINUTES = 24 * 60


class ValidationError(ValueError):
    def __init__(self, message, field=None):
        super().__init__(message)
        self.message = message
        self.field = field


@dataclass
class Location:
    lat: float
    lng: float
    label: str | None = None


@dataclass
class Problem:
    kind: str
    locations: list[Location]
    vehicles: int = 1
    demands: list[int] = field(default_factory=list)
    capacities: list[int] = field(default_factory=list)
    time_windows: list[tuple[int, int]] = field(default_factory=list)
    service_minutes: int = 0


def _number(value, name, field_name):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        raise ValidationError(f"{name} must be a number.", field_name)
    return float(value)


def _integer(value, name, field_name, lo, hi):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or int(value) != value:
        raise ValidationError(f"{name} must be a whole number.", field_name)
    value = int(value)
    if not lo <= value <= hi:
        raise ValidationError(f"{name} must be between {lo} and {hi}.", field_name)
    return value


def _list(value, name, field_name, length=None):
    if not isinstance(value, list):
        raise ValidationError(f"{name} must be a list.", field_name)
    if length is not None and len(value) != length:
        raise ValidationError(f"{name} needs exactly {length} entries, one per {'stop' if field_name != 'capacities' else 'vehicle'}.", field_name)
    return value


def stop_name(i):
    return "the depot" if i == 0 else f"stop {i}"


def parse(kind, payload):
    if kind not in PROBLEMS:
        raise ValidationError(f"Unknown problem type '{kind}'.")
    if not isinstance(payload, dict):
        raise ValidationError("The request body must be a JSON object.")

    raw = _list(payload.get("locations"), "Locations", "locations")
    if len(raw) < 2:
        raise ValidationError("Add a depot and at least one stop.", "locations")
    if len(raw) > MAX_LOCATIONS:
        raise ValidationError(f"A plan can have at most {MAX_LOCATIONS} locations; this one has {len(raw)}.", "locations")

    locations = []
    for i, item in enumerate(raw):
        if not isinstance(item, dict):
            raise ValidationError(f"Location {i} must be an object with lat and lng.", "locations")
        lat = _number(item.get("lat"), f"Latitude of {stop_name(i)}", "locations")
        lng = _number(item.get("lng"), f"Longitude of {stop_name(i)}", "locations")
        if not -90 <= lat <= 90 or not -180 <= lng <= 180:
            raise ValidationError(f"Coordinates of {stop_name(i)} are outside the map.", "locations")
        label = item.get("label")
        label = label.strip()[:200] if isinstance(label, str) and label.strip() else None
        locations.append(Location(lat, lng, label))

    problem = Problem(kind, locations)
    n = len(locations)

    if kind != "tsp":
        problem.vehicles = _integer(payload.get("vehicles"), "Number of vehicles", "vehicles", 1, MAX_VEHICLES)

    if kind == "cvrp":
        demands = _list(payload.get("demands"), "Demands", "demands", n)
        problem.demands = [0] + [_integer(d, f"Demand at {stop_name(i)}", "demands", 0, MAX_QUANTITY) for i, d in enumerate(demands) if i > 0]
        caps = _list(payload.get("capacities"), "Capacities", "capacities", problem.vehicles)
        problem.capacities = [_integer(c, f"Capacity of vehicle {i + 1}", "capacities", 1, MAX_QUANTITY) for i, c in enumerate(caps)]
        biggest = max(problem.capacities)
        for i, d in enumerate(problem.demands):
            if d > biggest:
                raise ValidationError(f"Stop {i} needs {d} units but the largest vehicle carries {biggest}.", "demands")
        total, fleet = sum(problem.demands), sum(problem.capacities)
        if total > fleet:
            raise ValidationError(f"Stops need {total} units in total but the fleet carries {fleet}. Add vehicles or capacity.", "demands")

    if kind == "vrptw":
        windows = _list(payload.get("time_windows"), "Time windows", "time_windows", n)
        parsed = []
        for i, w in enumerate(windows):
            if not isinstance(w, list) or len(w) != 2:
                raise ValidationError(f"The window for {stop_name(i)} must be [start, end] in minutes.", "time_windows")
            start = _integer(w[0], f"Window start for {stop_name(i)}", "time_windows", 0, DAY_MINUTES)
            end = _integer(w[1], f"Window end for {stop_name(i)}", "time_windows", 0, DAY_MINUTES)
            if start >= end:
                raise ValidationError(f"The window for {stop_name(i)} must open before it closes.", "time_windows")
            parsed.append((start, end))
        d0, d1 = parsed[0]
        for i, (s, e) in enumerate(parsed[1:], start=1):
            if e < d0 or s > d1:
                raise ValidationError(f"The window for stop {i} falls outside the depot's opening hours.", "time_windows")
        problem.time_windows = parsed
        if payload.get("service_minutes") is not None:
            problem.service_minutes = _integer(payload["service_minutes"], "Minutes at each stop", "service_minutes", 0, 240)

    return problem
