import unittest

from validation import ValidationError, parse

LOCS = [{"lat": 33.6, "lng": -7.53}, {"lat": 33.58, "lng": -7.63}, {"lat": 33.59, "lng": -7.66}]


class ValidationTest(unittest.TestCase):
    def bad(self, kind, payload, contains):
        with self.assertRaises(ValidationError) as ctx:
            parse(kind, payload)
        self.assertIn(contains, ctx.exception.message)

    def test_needs_two_locations(self):
        self.bad("tsp", {"locations": LOCS[:1]}, "at least one stop")

    def test_rejects_bad_coordinates(self):
        self.bad("tsp", {"locations": [LOCS[0], {"lat": 95, "lng": 0}]}, "outside the map")
        self.bad("tsp", {"locations": [LOCS[0], {"lat": "x", "lng": 0}]}, "must be a number")
        self.bad("tsp", {"locations": [LOCS[0], {"lat": True, "lng": 0}]}, "must be a number")

    def test_vehicle_count(self):
        self.bad("vrp", {"locations": LOCS}, "Number of vehicles")
        self.bad("vrp", {"locations": LOCS, "vehicles": 0}, "between 1 and 50")
        self.bad("vrp", {"locations": LOCS, "vehicles": 1.5}, "whole number")
        self.assertEqual(parse("vrp", {"locations": LOCS, "vehicles": 2}).vehicles, 2)

    def test_cvrp_capacity(self):
        base = {"locations": LOCS, "vehicles": 1, "capacities": [5]}
        self.bad("cvrp", {**base, "demands": [0, 1]}, "exactly 3")
        self.bad("cvrp", {**base, "demands": [0, 6, 1]}, "largest vehicle carries 5")
        self.bad("cvrp", {**base, "demands": [0, 3, 3]}, "fleet carries 5")
        p = parse("cvrp", {**base, "demands": [9, 2, 3]})
        self.assertEqual(p.demands, [0, 2, 3])  # depot demand is ignored

    def test_vrptw_windows(self):
        base = {"locations": LOCS, "vehicles": 1}
        self.bad("vrptw", {**base, "time_windows": [[0, 1440], [600, 500], [0, 60]]}, "open before it closes")
        self.bad("vrptw", {**base, "time_windows": [[480, 600], [700, 800], [500, 550]]}, "outside the depot")
        self.bad("vrptw", {**base, "time_windows": [[0, 1440], [0, 2000], [0, 60]]}, "between 0 and 1440")
        p = parse("vrptw", {**base, "time_windows": [[0, 1440], [480, 600], [540, 720]], "service_minutes": 5})
        self.assertEqual(p.time_windows[1], (480, 600))
        self.assertEqual(p.service_minutes, 5)

    def test_labels_are_trimmed(self):
        p = parse("tsp", {"locations": [{"lat": 1, "lng": 1, "label": "  Depot "}, {"lat": 2, "lng": 2, "label": ""}]})
        self.assertEqual(p.locations[0].label, "Depot")
        self.assertIsNone(p.locations[1].label)


if __name__ == "__main__":
    unittest.main()
