export interface LatLng {
  lat: number;
  lng: number;
}

/** Problem types supported by the solver service. */
export type ProblemType = 'tsp' | 'vrp' | 'cvrp' | 'vrptw';

/** A stop as entered on the map. Index 0 is always the depot. */
export interface Stop extends LatLng {
  /** Name or address shown in lists; falls back to coordinates. */
  label?: string;
  /** CVRP only: quantity to deliver. */
  demand?: number;
  /** VRPTW only: [start, end] delivery window in minutes since midnight. */
  timeWindow?: [number, number];
}

export interface SolveRequest {
  problem: ProblemType;
  stops: Stop[];
  vehicles: number;
  /** CVRP only: one capacity per vehicle. */
  capacities?: number[];
  /** VRPTW only: minutes spent at each stop. */
  serviceMinutes?: number;
}

/** A stop in a solved route. */
export interface RouteStop extends LatLng {
  /** Position of this stop in the request's stop list (0 = depot). */
  index: number;
  label: string | null;
  demand?: number;
  /** VRPTW only, minutes since midnight. */
  timeWindow?: [number, number];
  arrival?: number;
}

export interface Solution {
  problem: ProblemType;
  routes: RouteStop[][];
  /** Whether the solver optimised on road distances or straight-line estimates. */
  matrix: 'road' | 'straight';
}

/** Drivable path for one solved route. */
export interface RouteGeometry {
  path: LatLng[];
  distanceKm: number;
  durationMin: number;
  /** false when road routing failed and the path is straight lines between stops. */
  onRoad: boolean;
}
