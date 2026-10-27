import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '@env/environment';
import { SolverService } from './solver.service';

describe('SolverService', () => {
  let service: SolverService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(SolverService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends the CVRP contract and maps the response', async () => {
    const result = firstValueFrom(
      service.solve({
        problem: 'cvrp',
        vehicles: 2,
        capacities: [5, 5],
        stops: [
          { lat: 0, lng: 0, demand: 7, label: 'Depot' },
          { lat: 1, lng: 1, demand: 2 },
          { lat: 2, lng: 2, demand: 3 },
        ],
      }),
    );

    const req = http.expectOne(`${environment.solverUrl}/cvrp`);
    expect(req.request.body).toEqual({
      locations: [{ lat: 0, lng: 0, label: 'Depot' }, { lat: 1, lng: 1 }, { lat: 2, lng: 2 }],
      vehicles: 2,
      demands: [0, 2, 3],
      capacities: [5, 5],
    });
    req.flush({
      problem: 'cvrp',
      matrix: 'road',
      routes: [
        { vehicle: 0, distance_m: 1000, duration_s: 120, load: 5, stops: [
          { index: 0, lat: 0, lng: 0, label: 'Depot', demand: 0 },
          { index: 2, lat: 2, lng: 2, label: null, demand: 3 },
          { index: 0, lat: 0, lng: 0, label: 'Depot', demand: 0 },
        ] },
      ],
    });

    const solution = await result;
    expect(solution.matrix).toBe('road');
    expect(solution.routes[0][1]).toMatchObject({ index: 2, demand: 3, label: null });
  });

  it('sends VRPTW windows in minutes with service time', () => {
    service.solve({
      problem: 'vrptw', vehicles: 1, serviceMinutes: 5,
      stops: [{ lat: 0, lng: 0, timeWindow: [420, 1140] }, { lat: 1, lng: 1, timeWindow: [480, 600] }],
    }).subscribe();
    const req = http.expectOne(`${environment.solverUrl}/vrptw`);
    expect(req.request.body.time_windows).toEqual([[420, 1140], [480, 600]]);
    expect(req.request.body.service_minutes).toBe(5);
    req.flush({ problem: 'vrptw', matrix: 'road', routes: [] });
  });

  it('surfaces the server error body', async () => {
    const result = firstValueFrom(service.solve({ problem: 'tsp', vehicles: 1, stops: [] }));
    http.expectOne(`${environment.solverUrl}/tsp`).flush({ error: 'Add a depot and at least one stop.' }, { status: 400, statusText: 'Bad Request' });
    await expect(result).rejects.toMatchObject({ status: 400, error: { error: 'Add a depot and at least one stop.' } });
  });
});
