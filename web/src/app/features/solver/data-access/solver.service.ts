import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '@env/environment';
import { Solution, SolveRequest } from '@core/models/routing.model';
import { SolveBody, SolveResponse } from './solver.api';

/** Talks to the solver service. Errors arrive as HttpErrorResponse with an `{ error }` body. */
@Injectable({ providedIn: 'root' })
export class SolverService {
  private readonly http = inject(HttpClient);
  private readonly url = environment.solverUrl;

  solve(req: SolveRequest): Observable<Solution> {
    return this.http.post<SolveResponse>(`${this.url}/${req.problem}`, this.toBody(req)).pipe(
      map((res) => ({
        problem: req.problem,
        matrix: res.matrix,
        routes: res.routes.map((r) =>
          r.stops.map((s) => ({
            index: s.index,
            lat: s.lat,
            lng: s.lng,
            label: s.label,
            demand: s.demand,
            timeWindow: s.window,
            arrival: s.arrival,
          })),
        ),
      })),
    );
  }

  private toBody({ problem, stops, vehicles, capacities, serviceMinutes }: SolveRequest): SolveBody {
    const body: SolveBody = {
      locations: stops.map(({ lat, lng, label }) => (label ? { lat, lng, label } : { lat, lng })),
    };
    if (problem !== 'tsp') body.vehicles = vehicles;
    if (problem === 'cvrp') {
      body.demands = stops.map((s, i) => (i === 0 ? 0 : (s.demand ?? 0)));
      body.capacities = capacities ?? [];
    }
    if (problem === 'vrptw') {
      body.time_windows = stops.map((s) => s.timeWindow ?? [0, 1440]);
      body.service_minutes = serviceMinutes ?? 0;
    }
    return body;
  }
}
