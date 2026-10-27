/** Wire format of the solver service (solver/server.py). Private to this folder. */

export interface SolveBody {
  locations: { lat: number; lng: number; label?: string }[];
  vehicles?: number;
  demands?: number[];
  capacities?: number[];
  time_windows?: [number, number][];
  service_minutes?: number;
}

export interface SolveResponse {
  problem: string;
  matrix: 'road' | 'straight';
  routes: {
    vehicle: number;
    distance_m: number;
    duration_s: number;
    load?: number;
    stops: {
      index: number;
      lat: number;
      lng: number;
      label: string | null;
      demand?: number;
      window?: [number, number];
      arrival?: number;
    }[];
  }[];
}
