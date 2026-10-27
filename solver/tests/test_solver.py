import unittest
from unittest import mock

import matrix
import solver
from validation import parse

# Depot plus 8 stops around Casablanca.
POINTS = [(33.6057, -7.53), (33.5806, -7.6327), (33.5915, -7.629), (33.595, -7.661), (33.53, -7.642),
          (33.5978, -7.643), (33.56, -7.68), (33.592, -7.69), (33.573, -7.6)]
LOCS = [{"lat": a, "lng": b} for a, b in POINTS]


def straight(locations):
    with mock.patch.object(matrix, "_osrm", side_effect=RuntimeError("offline")):
        return matrix.build(locations)


class SolverTest(unittest.TestCase):
    def run_problem(self, kind, **extra):
        problem = parse(kind, {"locations": LOCS, **extra})
        dist, dur, source = straight(problem.locations)
        self.assertEqual(source, "straight")
        return problem, solver.solve(problem, dist, dur)

    def assert_visits_all(self, routes):
        visited = sorted(n for r in routes for n in r["nodes"][1:-1])
        self.assertEqual(visited, list(range(1, len(LOCS))))
        for r in routes:
            self.assertEqual(r["nodes"][0], 0)
            self.assertEqual(r["nodes"][-1], 0)

    def test_matrix_uses_metres_not_rounded_km(self):
        dist, _, _ = straight(parse("tsp", {"locations": LOCS[:3]}).locations)
        self.assertGreater(dist[1][2], 500)  # neighbouring districts are not "0 km" apart

    def test_tsp(self):
        _, routes = self.run_problem("tsp")
        self.assertEqual(len(routes), 1)
        self.assert_visits_all(routes)

    def test_vrp_uses_several_vehicles(self):
        _, routes = self.run_problem("vrp", vehicles=3)
        self.assert_visits_all(routes)
        self.assertGreater(sum(1 for r in routes if len(r["nodes"]) > 2), 1)

    def test_cvrp_respects_capacity(self):
        demands = [0, 3, 2, 4, 5, 1, 3, 2, 4]
        _, routes = self.run_problem("cvrp", vehicles=3, demands=demands, capacities=[9, 9, 9])
        self.assert_visits_all(routes)
        for r in routes:
            self.assertLessEqual(sum(demands[n] for n in r["nodes"]), 9)

    def test_vrptw_respects_windows(self):
        windows = [[420, 1140]] + [[480 + 30 * i, 720 + 30 * i] for i in range(1, len(LOCS))]
        problem, routes = self.run_problem("vrptw", vehicles=2, time_windows=windows, service_minutes=5)
        self.assert_visits_all(routes)
        for r in routes:
            for node, arrival in zip(r["nodes"][1:-1], r["arrivals"][1:-1]):
                start, end = problem.time_windows[node]
                self.assertTrue(start <= arrival <= end, (node, arrival, start, end))

    def test_vrptw_infeasible(self):
        windows = [[480, 1140]] + [[480, 482]] * (len(LOCS) - 1)  # everyone at 8:00, one van
        with self.assertRaises(solver.Infeasible):
            self.run_problem("vrptw", vehicles=1, time_windows=windows)


if __name__ == "__main__":
    unittest.main()
