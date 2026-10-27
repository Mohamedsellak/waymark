import { Component } from '@angular/core';

/** Waymark mark: a plotted course through three fixes. */
@Component({
  selector: 'app-brand-mark',
  template: `
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="8" class="plate" />
      <path d="M8 23 C 12 23, 11 12, 16 12 S 21 18, 24 9" class="course" />
      <circle cx="8" cy="23" r="2.6" class="fix depot" />
      <circle cx="16" cy="12" r="2.2" class="fix" />
      <circle cx="24" cy="9" r="2.2" class="fix" />
    </svg>
  `,
  styles: `
    :host { display: inline-flex; width: 30px; height: 30px; }
    svg { width: 100%; height: 100%; }
    .plate { fill: var(--ink); }
    .course { fill: none; stroke: var(--magenta); stroke-width: 2.4; stroke-linecap: round; }
    .fix { fill: var(--paper); }
    .depot { fill: var(--magenta); stroke: var(--paper); stroke-width: 1.4; }
  `,
})
export class BrandMark {}
