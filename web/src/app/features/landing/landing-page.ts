import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PROBLEM_LIST } from '@core/models/problem.config';
import { AuthService } from '@core/services/auth.service';
import { ContourField } from '@shared/components/contour-field';
import { Icon } from '@shared/components/icon';
import { routeColor } from '@shared/utils/route-colors';
import { I18n } from '@core/i18n/i18n';
import { MessageKey } from '@core/i18n/messages';

interface DemoRoute { d: string; color: string; km: number; min: number; }

/** Synthetic sample plan drawn in the hero; coordinates are in the plate's own 640×460 space. */
const DEPOT = { x: 318, y: 252 };
const DEMO_STOPS = [
  { x: 210, y: 150 }, { x: 140, y: 214 }, { x: 176, y: 320 },
  { x: 402, y: 118 }, { x: 488, y: 168 }, { x: 452, y: 236 },
  { x: 432, y: 352 }, { x: 330, y: 392 }, { x: 236, y: 400 },
];

@Component({
  selector: 'app-landing-page',
  imports: [RouterLink, ContourField, Icon],
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.scss',
})
export class LandingPage {
  protected readonly auth = inject(AuthService);
  protected readonly i18n = inject(I18n);
  protected readonly problems = PROBLEM_LIST;
  protected readonly depot = DEPOT;
  protected readonly stops = DEMO_STOPS;
  protected readonly routes: DemoRoute[] = [
    { color: routeColor(0), km: 18.4, min: 41, d: 'M318 252 L300 252 L300 196 L232 196 L210 150 L170 170 L140 214 L150 268 L176 320 L250 300 L318 252' },
    { color: routeColor(1), km: 22.9, min: 48, d: 'M318 252 L352 230 L352 150 L402 118 L450 128 L488 168 L476 206 L452 236 L390 262 L318 252' },
    { color: routeColor(2), km: 15.2, min: 37, d: 'M318 252 L372 300 L432 352 L384 376 L330 392 L284 410 L236 400 L262 338 L318 252' },
  ];
  protected readonly lineStyle: Record<string, string> = { tsp: '', vrp: '', cvrp: '6 5', vrptw: '1 6' };
  protected readonly inputs: Record<string, MessageKey> = {
    tsp: 'landing.inputs.tsp',
    vrp: 'landing.inputs.vrp',
    cvrp: 'landing.inputs.cvrp',
    vrptw: 'landing.inputs.vrptw',
  };
  protected readonly color = routeColor;
}
