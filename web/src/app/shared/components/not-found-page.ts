import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ContourField } from './contour-field';
import { I18n } from '@core/i18n/i18n';

@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink, ContourField],
  template: `
    <app-contour-field [width]="1400" [height]="900" [seed]="404" [levels]="20" />
    <section class="sheet box">
      <h1>{{ i18n.t('notFound.h1') }}</h1>
      <p class="muted">{{ i18n.t('notFound.body') }}</p>
      <a class="btn" routerLink="/">{{ i18n.t('notFound.back') }}</a>
    </section>
  `,
  styles: `
    :host { position: relative; display: grid; place-items: center; min-height: calc(100dvh - var(--topbar)); padding: 24px; overflow: hidden; }
    .box { position: relative; max-width: 420px; padding: 32px; display: grid; gap: 14px; justify-items: start; box-shadow: var(--shadow-lift); }
    h1 { font-size: 2.2rem; font-weight: 700; }
  `,
})
export class NotFoundPage {
  protected readonly i18n = inject(I18n);
}
