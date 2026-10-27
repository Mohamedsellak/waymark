import unittest
from unittest import mock

import auth
import matrix
import server

LOCS = [{"lat": 33.6057, "lng": -7.53, "label": "Depot"}, {"lat": 33.5806, "lng": -7.6327}, {"lat": 33.5915, "lng": -7.629}]


def fake(status, body):
    r = mock.Mock(status_code=status, ok=200 <= status < 300)
    r.json.return_value = body
    return r


class ApiTest(unittest.TestCase):
    def setUp(self):
        auth._verified.clear()
        auth._history.clear()
        self.client = server.app.test_client()
        self.osrm = mock.patch.object(matrix, "_osrm", side_effect=RuntimeError("offline"))
        self.osrm.start()

    def tearDown(self):
        self.osrm.stop()

    def post(self, path, body, token="Bearer header.payload.signature", access=True):
        headers = {"Authorization": token} if token else {}
        with mock.patch("auth.requests.post", return_value=fake(200, access)):
            return self.client.post(path, json=body, headers=headers)

    def test_health(self):
        self.assertEqual(self.client.get("/health").get_json()["status"], "ok")

    def test_requires_token(self):
        self.assertEqual(self.post("/tsp", {"locations": LOCS}, token=None).status_code, 401)

    def test_rejects_denied_user(self):
        self.assertEqual(self.post("/tsp", {"locations": LOCS}, access=False).status_code, 403)

    def test_validation_error_names_field(self):
        res = self.post("/vrp", {"locations": LOCS, "vehicles": 0})
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.get_json()["field"], "vehicles")

    def test_unknown_problem(self):
        self.assertEqual(self.post("/foo", {"locations": LOCS}).status_code, 404)

    def test_solve_shape(self):
        res = self.post("/cvrp", {"locations": LOCS, "vehicles": 2, "demands": [0, 1, 2], "capacities": [3, 3]})
        self.assertEqual(res.status_code, 200)
        body = res.get_json()
        self.assertEqual(body["matrix"], "straight")
        route = next(r for r in body["routes"] if len(r["stops"]) > 2)
        self.assertEqual(route["stops"][0]["label"], "Depot")
        self.assertIn("demand", route["stops"][1])
        self.assertIn("load", route)

    def test_vrptw_returns_arrivals(self):
        body = {"locations": LOCS, "vehicles": 1, "time_windows": [[480, 1080], [540, 720], [600, 900]], "service_minutes": 10}
        stops = self.post("/vrptw", body).get_json()["routes"][0]["stops"]
        self.assertTrue(all("arrival" in s and "window" in s for s in stops))
        self.assertGreaterEqual(stops[1]["arrival"], stops[1]["window"][0])

    def test_rate_limit(self):
        with mock.patch.object(auth, "RATE_LIMIT", 2):
            codes = [self.post("/tsp", {"locations": LOCS}).status_code for _ in range(3)]
        self.assertEqual(codes, [200, 200, 429])


if __name__ == "__main__":
    unittest.main()
