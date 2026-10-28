import { Component, inject } from '@angular/core';
import { SolverStore } from '../data-access/solver.store';
import { routeColor } from '@shared/utils/route-colors';
import { formatDuration, formatKm } from '@shared/utils/geo';
import { I18n } from '@core/i18n/i18n';

/** The map's printed legend: route inks with distance and drive time, keyed like a survey sheet. */
@Component({
  selector: 'app-map-legend',
  template: `
    <section class="legend" [attr.aria-label]="i18n.t('legend.label')">
      <h2>{{ i18n.t('legend.h') }}</h2>
      <dl class="keys">
        <div><dt><span class="k-depot"></span></dt><dd>{{ i18n.t('legend.depot') }}</dd></div>
        <div><dt><span class="k-stop"></span></dt><dd>{{ i18n.t('legend.stop') }}</dd></div>
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
                  <span class="name">{{ store.config().multiVehicle ? i18n.t('results.vehicle', { n: r.index + 1 }) : i18n.t('results.tour') }}</span>
                  <span class="num">{{ km(r.distanceKm) }}</span>
                  <span class="num subtle">{{ dur(r.durationMin) }}</span>
                </button>
              </li>
            }
          }
        </ul>
        @if (!store.totals().onRoad) {
          <p class="note">{{ i18n.t('legend.dotted') }}</p>
        }
      }
    </section>
  `,
  styleUrl: './map-legend.scss',
})
export class MapLegend {
  protected readonly store = inject(SolverStore);
  protected readonly i18n = inject(I18n);
  protected readonly color = routeColor;
  protected readonly km = formatKm;
  protected readonly dur = formatDuration;
}
