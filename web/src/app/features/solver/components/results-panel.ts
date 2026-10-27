import { Component, computed, inject } from '@angular/core';
import { Icon } from '@shared/components/icon';
import { downloadFile, toCsv } from '@shared/utils/csv';
import { formatClock, formatCoord, formatDuration, formatKm } from '@shared/utils/geo';
import { routeColor } from '@shared/utils/route-colors';
import { SolverStore } from '../data-access/solver.store';

/** Solved routes: totals, then one block per vehicle with its ordered stops. */
@Component({
  selector: 'app-results-panel',
  imports: [Icon],
  templateUrl: './results-panel.html',
  styleUrl: './results-panel.scss',
})
export class ResultsPanel {
  protected readonly store = inject(SolverStore);
  protected readonly color = routeColor;
  protected readonly km = formatKm;
  protected readonly dur = formatDuration;
  protected readonly clock = formatClock;
  protected readonly coord = formatCoord;

  protected readonly idle = computed(() => this.store.summaries().filter((s) => s.stops === 0).length);

  protected exportCsv(): void {
    const sol = this.store.solution();
    if (!sol) return;
    const header = ['vehicle', 'order', 'stop', 'label', 'lat', 'lng', 'demand', 'window_start', 'window_end', 'arrival', 'route_km', 'route_min'];
    const rows = sol.routes.flatMap((route, r) => {
      const s = this.store.summaries()[r];
      return route.map((stop, i) => [
        r + 1, i, stop.index === 0 ? 'depot' : stop.index, stop.label ?? '', stop.lat, stop.lng, stop.demand ?? '',
        stop.timeWindow ? this.clock(stop.timeWindow[0]) : '', stop.timeWindow ? this.clock(stop.timeWindow[1]) : '',
        stop.arrival !== undefined ? this.clock(stop.arrival) : '', s.distanceKm.toFixed(2), Math.round(s.durationMin),
      ]);
    });
    downloadFile(`waymark-${sol.problem}-routes.csv`, toCsv([header, ...rows]));
  }
}
