import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ContourField } from './contour-field';

@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink, ContourField],
  template: `
    <app-contour-field [width]="1400" [height]="900" [seed]="404" [levels]="20" />
    <section class="sheet box">
      <h1>Off the map</h1>
      <p class="muted">There’s nothing at this address. Check the link, or head back to your planner.</p>
      <a class="btn" routerLink="/">Back to Waymark</a>
    </section>
  `,
  styles: `
    :host { position: relative; display: grid; place-items: center; min-height: calc(100dvh - var(--topbar)); padding: 24px; overflow: hidden; }
    .box { position: relative; max-width: 420px; padding: 32px; display: grid; gap: 14px; justify-items: start; box-shadow: var(--shadow-lift); }
    h1 { font-size: 2.2rem; font-weight: 700; }
  `,
})
export class NotFoundPage {}
