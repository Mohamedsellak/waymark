import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PROBLEM_LIST } from '@core/models/problem.config';
import { Icon } from '@shared/components/icon';
import { routeColor } from '@shared/utils/route-colors';
import { SolverStore } from '@features/solver/data-access/solver.store';
import { I18n } from '@core/i18n/i18n';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink, Icon],
  template: `
    <div class="page">
      <header class="head">
        <h1>{{ i18n.t('home.h1') }}</h1>
        <p class="muted">{{ i18n.t('home.lede') }}</p>
      </header>

      @if (store.stops().length) {
        <a class="resume sheet" [routerLink]="['/solve', store.problem()]">
          <app-icon name="map" />
          <span>
            <strong>{{ i18n.t('home.continue') }}</strong>
            <span class="muted">{{ i18n.t('home.resume', { count: store.stops().length, problem: i18n.t(store.config().title) }) }}</span>
          </span>
          <app-icon name="arrow-right" class="go" />
        </a>
      }

      <ul class="key">
        @for (p of problems; track p.type; let i = $index) {
          <li>
            <a [routerLink]="['/solve', p.type]">
              <svg class="line" viewBox="0 0 72 10" aria-hidden="true">
                <path d="M3 5h66" [attr.stroke]="color(i)" stroke-width="5" stroke-linecap="round" [attr.stroke-dasharray]="dash[p.type] || null" />
              </svg>
              <span class="text">
                <span class="title">{{ i18n.t(p.title) }}</span>
                <span class="muted">{{ i18n.t(p.description) }}</span>
              </span>
              <span class="needs">
                @if (p.multiVehicle) { <span class="badge"><app-icon name="truck" />{{ i18n.t('home.fleet') }}</span> }
                @if (p.needsDemand) { <span class="badge"><app-icon name="package" />{{ i18n.t('home.capacity') }}</span> }
                @if (p.needsTimeWindow) { <span class="badge"><app-icon name="clock" />{{ i18n.t('home.windows') }}</span> }
              </span>
              <app-icon name="arrow-right" class="go" />
            </a>
          </li>
        }
      </ul>
    </div>
  `,
  styles: `
    .head { display: grid; gap: 8px; margin-bottom: 28px; h1 { font-size: 2rem; } }
    .resume {
      display: flex; align-items: center; gap: 14px; padding: 14px 18px; margin-bottom: 28px;
      color: var(--ink); text-decoration: none; border-color: var(--magenta);
      > app-icon { width: 22px; height: 22px; color: var(--magenta); }
      > span { display: grid; flex: 1; }
      &:hover { background: var(--magenta-soft); text-decoration: none; }
    }
    .key { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--ink-2); }
    .key a {
      display: grid; grid-template-columns: 88px minmax(0, 1fr) auto 24px; gap: 24px; align-items: center;
      padding: 20px 12px; margin: 0 -12px; border-bottom: 1px solid var(--rule); border-radius: 0;
      color: var(--ink); text-decoration: none; transition: background-color 140ms;
      &:hover { background: var(--sheet); .go { color: var(--magenta); transform: translateX(3px); } }
    }
    .line { width: 72px; height: 10px; }
    .text { display: grid; gap: 2px; }
    .title { font: 600 1.2rem var(--font-cond); }
    .needs { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; .badge app-icon { width: 14px; height: 14px; } }
    .go { width: 20px; height: 20px; color: var(--ink-3); transition: transform 160ms var(--ease-out), color 160ms; }
    @media (max-width: 720px) {
      .key a { grid-template-columns: 56px 1fr 20px; gap: 6px 14px; }
      .line { width: 56px; }
      .needs { grid-column: 2; grid-row: 2; justify-content: flex-start; }
      .go { grid-column: 3; grid-row: 1; }
    }
  `,
})
export class HomePage {
  protected readonly store = inject(SolverStore);
  protected readonly i18n = inject(I18n);
  protected readonly problems = PROBLEM_LIST;
  protected readonly color = routeColor;
  protected readonly dash: Record<string, string> = { cvrp: '6 5', vrptw: '1 6' };
}
