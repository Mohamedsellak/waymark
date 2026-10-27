import { Component, inject } from '@angular/core';
import { SolverStore } from '../data-access/solver.store';
import { routeColor } from '@shared/utils/route-colors';
import { formatDuration, formatKm } from '@shared/utils/geo';

/** The map's printed legend: route inks with distance and drive time, keyed like a survey sheet. */
@Component({
  selector: 'app-map-legend',
  template: `
    <section class="legend" aria-label="Map legend">
      <h2>Legend</h2>
      <dl class="keys">
        <div><dt><span class="k-depot"></span></dt><dd>Depot</dd></div>
        <div><dt><span class="k-stop"></span></dt><dd>Stop, numbered in entry order</dd></div>
      </dl>
      @if (store.summaries().length) {
        <ul class="routes">
          @for (r of store.summaries(); track r.index) {
            @if (r.stops > 0) {
              <li [class.dim]="store.hidden().has(r.index) || (store.focused() !== null && store.focused() !== r.index)">
                <button type="button" (click)="store.focusRoute(r.index)" [attr.aria-pressed]="store.focused() === r.index">
                  <svg class="ink" viewBox="0 0 28 8" aria-hidden="true">
                    <path d="M1 4h26" [attr.stroke]="color(r.index)" stroke-width="4" stroke-linecap="round" [attr.stroke-dasharray]="r.onRoad ? null : '1 5'" />
                  </svg>
                  <span class="name">{{ store.config().multiVehicle ? 'Vehicle ' + (r.index + 1) : 'Tour' }}</span>
                  <span class="num">{{ km(r.distanceKm) }}</span>
                  <span class="num subtle">{{ dur(r.durationMin) }}</span>
                </button>
              </li>
            }
          }
        </ul>
        @if (!store.totals().onRoad) {
          <p class="note">Dotted lines are straight-line estimates; road routing was unavailable.</p>
        }
      }
    </section>
  `,
  styleUrl: './map-legend.scss',
})
export class MapLegend {
  protected readonly store = inject(SolverStore);
  protected readonly color = routeColor;
  protected readonly km = formatKm;
  protected readonly dur = formatDuration;
}
