"""One OR-Tools routing model for all four problem types."""
import math

from ortools.constraint_solver import pywrapcp, routing_enums_pb2

from validation import Problem

# Weight of the longest route in the objective (VRP): spreads stops across vehicles.
BALANCE_COEFFICIENT = 20
# Cost of one route minute relative to one metre of distance (VRPTW).
TIME_SPAN_COEFFICIENT = 10


class Infeasible(Exception):
    pass


def _time_limit(n):
    return max(1, min(10, 1 + n // 15))


def solve(problem: Problem, dist, dur):
    n = len(problem.locations)
    vehicles = 1 if problem.kind == "tsp" else problem.vehicles
    manager = pywrapcp.RoutingIndexManager(n, vehicles, 0)
    routing = pywrapcp.RoutingModel(manager)

    def distance_cb(i, j):
        return dist[manager.IndexToNode(i)][manager.IndexToNode(j)]

    distance_idx = routing.RegisterTransitCallback(distance_cb)
    routing.SetArcCostEvaluatorOfAllVehicles(distance_idx)

    if problem.kind == "vrp":
        routing.AddDimension(distance_idx, 0, 10**9, True, "Distance")
        routing.GetDimensionOrDie("Distance").SetGlobalSpanCostCoefficient(BALANCE_COEFFICIENT)

    if problem.kind == "cvrp":
        def demand_cb(i):
            return problem.demands[manager.IndexToNode(i)]

        demand_idx = routing.RegisterUnaryTransitCallback(demand_cb)
        routing.AddDimensionWithVehicleCapacity(demand_idx, 0, problem.capacities, True, "Capacity")

    time_dim = None
    if problem.kind == "vrptw":
        service = problem.service_minutes

        def time_cb(i, j):
            a, b = manager.IndexToNode(i), manager.IndexToNode(j)
            return math.ceil(dur[a][b] / 60) + (service if a != 0 else 0)

        time_idx = routing.RegisterTransitCallback(time_cb)
        day = 24 * 60
        routing.AddDimension(time_idx, day, day, False, "Time")  # waiting allowed, horizon one day
        time_dim = routing.GetDimensionOrDie("Time")
        # A small price per minute on the road or waiting: vans leave when needed instead of idling at the first stop.
        time_dim.SetSpanCostCoefficientForAllVehicles(TIME_SPAN_COEFFICIENT)
        for node in range(1, n):
            start, end = problem.time_windows[node]
            cumul = time_dim.CumulVar(manager.NodeToIndex(node))
            cumul.SetRange(start, end)
            routing.AddVariableMinimizedByFinalizer(cumul)  # report the earliest arrival, not any feasible one
        d_start, d_end = problem.time_windows[0]
        for v in range(vehicles):
            time_dim.CumulVar(routing.Start(v)).SetRange(d_start, d_end)
            time_dim.CumulVar(routing.End(v)).SetRange(d_start, d_end)
            routing.AddVariableMinimizedByFinalizer(time_dim.CumulVar(routing.Start(v)))
            routing.AddVariableMinimizedByFinalizer(time_dim.CumulVar(routing.End(v)))

    params = pywrapcp.DefaultRoutingSearchParameters()
    params.first_solution_strategy = routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    params.local_search_metaheuristic = routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    params.time_limit.FromSeconds(_time_limit(n))

    solution = routing.SolveWithParameters(params)
    if not solution:
        raise Infeasible(_infeasible_message(problem))

    routes = []
    for v in range(vehicles):
        index = routing.Start(v)
        nodes, arrivals = [], []
        distance = duration = 0
        while True:
            node = manager.IndexToNode(index)
            nodes.append(node)
            if time_dim:
                arrivals.append(solution.Min(time_dim.CumulVar(index)))
            if routing.IsEnd(index):
                break
            nxt = solution.Value(routing.NextVar(index))
            a, b = node, manager.IndexToNode(nxt)
            distance += dist[a][b]
            duration += dur[a][b]
            index = nxt
        routes.append({"vehicle": v, "nodes": nodes, "arrivals": arrivals, "distance_m": distance, "duration_s": duration})
    return routes


def _infeasible_message(problem):
    if problem.kind == "vrptw":
        return ("No plan reaches every stop inside its window. Widen the windows, add vehicles, "
                "or reduce the minutes spent at each stop.")
    if problem.kind == "cvrp":
        return "No plan fits every demand into the vehicles. Add vehicles or capacity."
    return "The solver could not find a route. Check that every stop is reachable."
