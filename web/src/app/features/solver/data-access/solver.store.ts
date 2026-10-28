import { DestroyRef, Injectable, computed, effect, inject, signal } from '@angular/core';
import { forkJoin, of, switchMap } from 'rxjs';
import { LatLng, ProblemType, RouteGeometry, Solution, Stop } from '@core/models/routing.model';
import { PROBLEMS } from '@core/models/problem.config';
import { errorMessage } from '@core/utils/http-error';
import { SolverService } from './solver.service';
import { RoadRouterService } from './road-router.service';
import { SAMPLE_STOPS } from './sample-stops';
import { GeocoderService } from './geocoder.service';
import { t } from '@core/i18n/i18n';

const KEY = 'wm_plan';
/** Minutes since midnight. */
export const DEFAULT_WINDOW: [number, number] = [8 * 60, 17 * 60];
export const DEPOT_WINDOW: [number, number] = [7 * 60, 19 * 60];
export const MAX_STOPS = 150;
export const MAX_VEHICLES = 50;

interface SavedPlan {
  stops: Stop[];
  vehicles: number;
  capacity: number;
  serviceMinutes?: number;
}

function load(): SavedPlan | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const plan = JSON.parse(raw) as SavedPlan;
    // Plans saved before windows moved to minutes stored whole hours.
    if (plan.stops?.some((s) => s.timeWindow && s.timeWindow[1] <= 24)) {
      plan.stops = plan.stops.map((s) => (s.timeWindow ? { ...s, timeWindow: [s.timeWindow[0] * 60, s.timeWindow[1] * 60] } : s));
    }
    return plan;
  } catch {
    return null;
  }
}

export interface RouteSummary {
  index: number;
  stops: number;
  distanceKm: number;
  durationMin: number;
  load: number;
  onRoad: boolean;
}

/**
 * The plan being edited: stops, fleet, and the latest solution with its road geometry.
 * Lives at root so it survives switching between problem types, and is saved locally.
 */
@Injectable({ providedIn: 'root' })
export class SolverStore {
  private readonly solver = inject(SolverService);
  private readonly router = inject(RoadRouterService);
  private readonly geocoder = inject(GeocoderService);

  private readonly saved = load();

  readonly problem = signal<ProblemType>('tsp');
  readonly config = computed(() => PROBLEMS[this.problem()]);

  readonly stops = signal<Stop[]>(this.saved?.stops ?? []);
  readonly vehicles = signal(this.saved?.vehicles ?? 2);
  readonly capacity = signal(this.saved?.capacity ?? 15);
  readonly serviceMinutes = signal(this.saved?.serviceMinutes ?? 5);

  readonly solution = signal<Solution | null>(null);
  readonly geometries = signal<RouteGeometry[]>([]);
  readonly hidden = signal<ReadonlySet<number>>(new Set());
  readonly focused = signal<number | null>(null);
  readonly hoveredStop = signal<number | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  /** Stop index → route index, for colouring markers after a solve. */
  readonly assignment = computed(() => {
    const map = new Map<number, number>();
    this.solution()?.routes.forEach((route, r) => route.forEach((rs) => rs.index > 0 && map.set(rs.index, r)));
    return map;
  });

  readonly summaries = computed<RouteSummary[]>(() => {
    const sol = this.solution();
    if (!sol) return [];
    return sol.routes.map((route, i) => {
      const geo = this.geometries()[i];
      return {
        index: i,
        stops: Math.max(0, route.length - 2),
        distanceKm: geo?.distanceKm ?? 0,
        durationMin: geo?.durationMin ?? 0,
        load: route.reduce((sum, s) => sum + (s.demand ?? 0), 0),
        onRoad: geo?.onRoad ?? false,
      };
    });
  });

  readonly totals = computed(() => {
    const used = this.summaries().filter((s) => s.stops > 0);
    return {
      distanceKm: used.reduce((a, s) => a + s.distanceKm, 0),
      durationMin: used.reduce((a, s) => a + s.durationMin, 0),
      stops: used.reduce((a, s) => a + s.stops, 0),
      vehiclesUsed: used.length,
      onRoad: used.every((s) => s.onRoad),
    };
  });

  readonly totalDemand = computed(() => this.stops().slice(1).reduce((a, s) => a + (s.demand ?? 0), 0));

  readonly validationError = computed(() => {
    const cfg = this.config();
    const stops = this.stops();
    if (stops.length < 2) return t('valid.needStops');
    if (stops.length > MAX_STOPS) return t('valid.tooMany', { max: MAX_STOPS, extra: stops.length - MAX_STOPS });
    if (cfg.multiVehicle && (!Number.isInteger(this.vehicles()) || this.vehicles() < 1 || this.vehicles() > MAX_VEHICLES)) {
      return t('valid.vehicles', { max: MAX_VEHICLES });
    }
    if (cfg.needsDemand) {
      if (this.capacity() < 1) return t('valid.capacity');
      const heavy = stops.findIndex((s, i) => i > 0 && (s.demand ?? 0) > this.capacity());
      if (heavy > 0) return t('valid.heavy', { n: heavy, capacity: this.capacity() });
      if (this.totalDemand() > this.vehicles() * this.capacity()) {
        return t('valid.demand', { demand: this.totalDemand(), fleet: this.vehicles() * this.capacity() });
      }
    }
    if (cfg.needsTimeWindow) {
      const bad = stops.findIndex((s) => !s.timeWindow || s.timeWindow[0] >= s.timeWindow[1]);
      if (bad >= 0) return t('valid.window', { stop: bad === 0 ? t('stop.theDepot') : t('stop.lower', { n: bad }) });
      const [d0, d1] = stops[0].timeWindow!;
      const outside = stops.findIndex((s, i) => i > 0 && (s.timeWindow![1] < d0 || s.timeWindow![0] > d1));
      if (outside > 0) return t('valid.outside', { n: outside });
      if (this.serviceMinutes() < 0 || this.serviceMinutes() > 240) return t('valid.service');
    }
    return null;
  });

  constructor() {
    effect(() => {
      const plan: SavedPlan = {
        stops: this.stops(), vehicles: this.vehicles(), capacity: this.capacity(), serviceMinutes: this.serviceMinutes(),
      };
      try {
        localStorage.setItem(KEY, JSON.stringify(plan));
      } catch {
        /* plan just won't persist */
      }
    });
    inject(DestroyRef).onDestroy(() => clearTimeout(this.geocodeTimer));
    this.stops().forEach((s) => !s.label && this.queueLabel(s));
  }

  setProblem(problem: ProblemType): void {
    if (problem === this.problem()) return;
    this.problem.set(problem);
    this.stops.update((list) => list.map((s, i) => this.withDefaults(s, i)));
    this.invalidate();
  }

  addStop(point: LatLng & { label?: string }): void {
    const stop = this.withDefaults({ ...point }, this.stops().length);
    this.stops.update((list) => [...list, stop]);
    this.invalidate();
    if (!stop.label) this.queueLabel(stop);
  }

  addStops(stops: Stop[], replace = false): void {
    this.stops.update((list) => {
      const base = replace ? [] : list;
      return [...base, ...stops.map((s, i) => this.withDefaults({ ...s }, base.length + i))];
    });
    this.invalidate();
  }

  updateStop(index: number, patch: Partial<Stop>): void {
    this.stops.update((list) => list.map((s, i) => (i === index ? { ...s, ...patch } : s)));
    this.invalidate();
  }

  setWindow(index: number, edge: 0 | 1, value: number): void {
    const next: [number, number] = [...(this.stops()[index]?.timeWindow ?? DEFAULT_WINDOW)];
    next[edge] = value;
    this.updateStop(index, { timeWindow: next });
  }

  moveStop(index: number, to: LatLng): void {
    this.updateStop(index, { lat: to.lat, lng: to.lng, label: undefined });
    this.queueLabel(this.stops()[index]);
  }

  removeStop(index: number): void {
    this.stops.update((list) => list.filter((_, i) => i !== index).map((s, i) => (i === 0 ? { ...s, demand: 0 } : s)));
    this.invalidate();
  }

  /** Makes a stop the depot by moving it to the front. */
  makeDepot(index: number): void {
    this.stops.update((list) => {
      const next = [...list];
      const [s] = next.splice(index, 1);
      return [{ ...s, demand: 0 }, ...next];
    });
    this.invalidate();
  }

  loadSample(): void {
    this.stops.set(SAMPLE_STOPS.map((s, i) => this.withDefaults({ ...s }, i)));
    this.vehicles.set(3);
    this.capacity.set(12);
    this.invalidate();
  }

  clear(): void {
    this.stops.set([]);
    this.invalidate();
  }

  toggleRoute(index: number): void {
    this.hidden.update((set) => {
      const next = new Set(set);
      if (!next.delete(index)) next.add(index);
      return next;
    });
  }

  focusRoute(index: number | null): void {
    this.focused.update((cur) => (cur === index ? null : index));
  }

  solve(): void {
    if (this.validationError() || this.loading()) return;
    const cfg = this.config();
    const vehicles = cfg.multiVehicle ? this.vehicles() : 1;

    this.loading.set(true);
    this.error.set(null);
    this.solver
      .solve({
        problem: cfg.type,
        stops: this.stops(),
        vehicles,
        capacities: cfg.needsDemand ? Array(vehicles).fill(this.capacity()) : undefined,
        serviceMinutes: cfg.needsTimeWindow ? this.serviceMinutes() : undefined,
      })
      .pipe(
        switchMap((solution) => {
          this.solution.set(solution);
          this.geometries.set([]);
          this.hidden.set(new Set());
          this.focused.set(null);
          return solution.routes.length ? forkJoin(solution.routes.map((r) => this.router.route(r))) : of([]);
        }),
      )
      .subscribe({
        next: (geos) => {
          this.geometries.set(geos);
          this.loading.set(false);
        },
        error: (err: unknown) => {
          this.error.set(errorMessage(err, t('solver.failed')));
          this.loading.set(false);
        },
      });
  }

  private invalidate(): void {
    this.solution.set(null);
    this.geometries.set([]);
    this.focused.set(null);
    this.error.set(null);
  }

  private withDefaults(stop: Stop, index: number): Stop {
    const depot = index === 0;
    return {
      ...stop,
      demand: depot ? 0 : (stop.demand ?? 1),
      timeWindow: stop.timeWindow ?? (depot ? [...DEPOT_WINDOW] : [...DEFAULT_WINDOW]),
    };
  }

  // ---- Address labels for stops placed by clicking the map ----
  // Nominatim allows one request per second, so lookups run one at a time in the background.

  private readonly labelQueue: Stop[] = [];
  private geocodeTimer?: ReturnType<typeof setTimeout>;
  private geocoding = false;

  private queueLabel(stop: Stop): void {
    this.labelQueue.push(stop);
    if (!this.geocoding) this.nextLabel();
  }

  private nextLabel(): void {
    const stop = this.labelQueue.shift();
    if (!stop) {
      this.geocoding = false;
      return;
    }
    this.geocoding = true;
    this.geocoder.reverse(stop).subscribe((label) => {
      if (label) {
        // Labels don't change the routes, so they must not clear the solution.
        this.stops.update((list) =>
          list.map((s) => (!s.label && s.lat === stop.lat && s.lng === stop.lng ? { ...s, label } : s)),
        );
      }
      this.geocodeTimer = setTimeout(() => this.nextLabel(), 1100);
    });
  }
}
