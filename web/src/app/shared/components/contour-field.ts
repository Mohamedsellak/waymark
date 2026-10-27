import { Component, computed, input } from '@angular/core';

interface Peak { x: number; y: number; h: number; s: number; }

/** Seeded PRNG so a given seed always draws the same terrain. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Topographic contour lines, computed with marching squares over a sum of
 * gaussian hills. Lines never cross, as on a real survey sheet.
 */
function contours(w: number, h: number, seed: number, levels: number): { d: string; index: boolean }[] {
  const rand = rng(seed);
  // Scale hills to the canvas so small plates get varied terrain, not one bullseye.
  const unit = Math.min(w, h);
  const peaks: Peak[] = Array.from({ length: 11 }, () => ({
    x: rand() * w, y: rand() * h, h: (rand() < 0.3 ? -0.5 : 0.35) + rand() * 0.8, s: unit * (0.09 + rand() * 0.2),
  }));
  const step = 8;
  const cols = Math.ceil(w / step) + 1;
  const rows = Math.ceil(h / step) + 1;
  const field: number[] = new Array(cols * rows);
  let max = -Infinity;
  let min = Infinity;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const x = i * step, y = j * step;
      let v = 0;
      for (const p of peaks) v += p.h * Math.exp(-((x - p.x) ** 2 + (y - p.y) ** 2) / (2 * p.s * p.s));
      v += 0.05 * Math.sin(x / 47 + y / 61); // gentle ridging
      field[j * cols + i] = v;
      if (v > max) max = v;
      if (v < min) min = v;
    }
  }

  const out: { d: string; index: boolean }[] = [];
  for (let l = 1; l <= levels; l++) {
    const t = min + (l / (levels + 1)) * (max - min);
    let d = '';
    for (let j = 0; j < rows - 1; j++) {
      for (let i = 0; i < cols - 1; i++) {
        const a = field[j * cols + i], b = field[j * cols + i + 1];
        const c = field[(j + 1) * cols + i + 1], e = field[(j + 1) * cols + i];
        const x = i * step, y = j * step;
        const lerp = (v1: number, v2: number) => (t - v1) / (v2 - v1);
        const top = () => [x + step * lerp(a, b), y];
        const right = () => [x + step, y + step * lerp(b, c)];
        const bottom = () => [x + step * lerp(e, c), y + step];
        const left = () => [x, y + step * lerp(a, e)];
        const code = (a > t ? 8 : 0) | (b > t ? 4 : 0) | (c > t ? 2 : 0) | (e > t ? 1 : 0);
        const segs: number[][][] = [];
        switch (code) {
          case 1: case 14: segs.push([left(), bottom()]); break;
          case 2: case 13: segs.push([bottom(), right()]); break;
          case 3: case 12: segs.push([left(), right()]); break;
          case 4: case 11: segs.push([top(), right()]); break;
          case 5: segs.push([left(), top()], [bottom(), right()]); break;
          case 6: case 9: segs.push([top(), bottom()]); break;
          case 7: case 8: segs.push([left(), top()]); break;
          case 10: segs.push([left(), bottom()], [top(), right()]); break;
        }
        for (const [p, q] of segs) d += `M${p[0].toFixed(1)} ${p[1].toFixed(1)}L${q[0].toFixed(1)} ${q[1].toFixed(1)}`;
      }
    }
    out.push({ d, index: l % 5 === 0 });
  }
  return out;
}

@Component({
  selector: 'app-contour-field',
  template: `
    <svg [attr.viewBox]="'0 0 ' + width() + ' ' + height()" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      @for (c of lines(); track $index) {
        <path [attr.d]="c.d" [class.index]="c.index" />
      }
    </svg>
  `,
  styles: `
    :host { display: block; position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
    svg { width: 100%; height: 100%; }
    path { fill: none; stroke: var(--contour); stroke-width: 0.8; stroke-linecap: round; opacity: 0.55; }
    path.index { stroke-width: 1.5; opacity: 0.8; }
  `,
})
export class ContourField {
  readonly width = input(1200);
  readonly height = input(800);
  readonly seed = input(7);
  readonly levels = input(16);
  protected readonly lines = computed(() => contours(this.width(), this.height(), this.seed(), this.levels()));
}
