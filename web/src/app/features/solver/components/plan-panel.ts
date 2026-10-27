import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { Icon } from '@shared/components/icon';
import { downloadFile, parseStopsCsv, toCsv } from '@shared/utils/csv';
import { formatClock, formatCoord, parseClock } from '@shared/utils/geo';
import { SolverStore } from '../data-access/solver.store';

/** Fleet settings and the editable stop list. */
@Component({
  selector: 'app-plan-panel',
  imports: [Icon],
  templateUrl: './plan-panel.html',
  styleUrl: './plan-panel.scss',
})
export class PlanPanel {
  protected readonly store = inject(SolverStore);
  protected readonly coord = formatCoord;
  protected readonly clock = formatClock;
  protected readonly importNote = signal<{ ok: boolean; text: string } | null>(null);
  private readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('file');

  protected num(value: string, min = 0): number {
    const n = Math.floor(Number(value));
    return Number.isFinite(n) ? Math.max(min, n) : min;
  }

  protected setTime(index: number, edge: 0 | 1, input: HTMLInputElement): void {
    const minutes = parseClock(input.value);
    if (minutes === null) {
      input.value = formatClock(this.store.stops()[index].timeWindow?.[edge] ?? 0);
      return;
    }
    this.store.setWindow(index, edge, minutes);
  }

  protected openImport(): void {
    this.fileInput().nativeElement.click();
  }

  protected async importCsv(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const { stops, skipped } = parseStopsCsv(await file.text());
    if (!stops.length) {
      this.importNote.set({ ok: false, text: 'No stops found. The file needs lat and lng columns.' });
      return;
    }
    const replace = this.store.stops().length === 0;
    this.store.addStops(stops, replace);
    const extra = skipped ? ` ${skipped} row${skipped > 1 ? 's' : ''} without valid coordinates skipped.` : '';
    this.importNote.set({ ok: true, text: `Imported ${stops.length} stop${stops.length > 1 ? 's' : ''}.${extra}` });
  }

  protected exportCsv(): void {
    const rows = this.store.stops().map((s, i) => [
      i === 0 ? 'depot' : i, s.label ?? '', s.lat, s.lng, s.demand ?? '',
      s.timeWindow ? formatClock(s.timeWindow[0]) : '', s.timeWindow ? formatClock(s.timeWindow[1]) : '',
    ]);
    downloadFile('waymark-stops.csv', toCsv([['stop', 'label', 'lat', 'lng', 'demand', 'start', 'end'], ...rows]));
  }

  protected clear(): void {
    if (confirm(`Remove all ${this.store.stops().length} stops?`)) this.store.clear();
  }
}
