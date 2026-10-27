import { Component, computed, effect, inject, input, signal, untracked, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LatLng, ProblemType } from '@core/models/routing.model';
import { PROBLEM_LIST } from '@core/models/problem.config';
import { Icon } from '@shared/components/icon';
import { SolverStore } from './data-access/solver.store';
import { Place } from './data-access/geocoder.service';
import { RouteMap } from './components/route-map';
import { AddressSearch } from './components/address-search';
import { MapLegend } from './components/map-legend';
import { PlanPanel } from './components/plan-panel';
import { ResultsPanel } from './components/results-panel';

type Tab = 'plan' | 'results';

/** Workspace: docked panel (plan / results) beside a full-height map. */
@Component({
  selector: 'app-solver-page',
  imports: [RouterLink, Icon, RouteMap, AddressSearch, MapLegend, PlanPanel, ResultsPanel],
  templateUrl: './solver-page.html',
  styleUrl: './solver-page.scss',
})
export class SolverPage {
  protected readonly store = inject(SolverStore);

  /** Bound from route data via `withComponentInputBinding()`. */
  readonly problem = input.required<ProblemType>();

  protected readonly problems = PROBLEM_LIST;
  protected readonly tab = signal<Tab>('plan');
  protected readonly mapRef = viewChild.required(RouteMap);
  protected readonly near = signal<LatLng | undefined>(undefined);

  protected readonly solveLabel = computed(() => {
    if (this.store.loading()) return 'Solving…';
    return this.store.solution() ? 'Solve again' : 'Solve routes';
  });

  constructor() {
    effect(() => {
      const p = this.problem();
      untracked(() => {
        this.store.setProblem(p);
        this.tab.set(this.store.solution() ? 'results' : 'plan');
      });
    });
    // Jump to results once a solve finishes.
    effect(() => {
      if (this.store.solution()) untracked(() => this.tab.set('results'));
      else untracked(() => this.tab.set('plan'));
    });
  }

  protected addFromMap(point: LatLng): void {
    this.store.addStop(point);
  }

  protected addPlace(place: Place): void {
    this.store.addStop({ lat: place.lat, lng: place.lng, label: place.label });
    this.mapRef().flyTo(place);
  }

  protected searchFocus(): void {
    this.near.set(this.mapRef().center());
  }
}
