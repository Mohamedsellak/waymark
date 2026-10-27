import { Component, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { Subject, catchError, debounceTime, distinctUntilChanged, filter, of, switchMap, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LatLng } from '@core/models/routing.model';
import { Icon } from '@shared/components/icon';
import { GeocoderService, Place } from '../data-access/geocoder.service';

/** Address search box over the map. Picking a result adds it as a stop. */
@Component({
  selector: 'app-address-search',
  imports: [Icon],
  template: `
    <div class="box" [class.open]="open()">
      <app-icon name="search" class="lead" />
      <input
        #input
        type="search"
        role="combobox"
        aria-label="Search an address to add as a stop"
        aria-autocomplete="list"
        aria-controls="place-list"
        [attr.aria-expanded]="open()"
        [attr.aria-activedescendant]="active() >= 0 ? 'place-' + active() : null"
        placeholder="Search an address or place"
        autocomplete="off"
        (input)="query$.next(input.value)"
        (keydown)="onKey($event)"
        (focus)="open.set(results().length > 0)"
        (blur)="close()"
      />
      @if (busy()) { <app-icon name="loader" class="spin" /> }
    </div>

    @if (open()) {
      <ul id="place-list" class="list" role="listbox" aria-label="Places">
        @for (p of results(); track $index; let i = $index) {
          <li
            [id]="'place-' + i"
            role="option"
            [attr.aria-selected]="active() === i"
            [class.active]="active() === i"
            (mousedown)="$event.preventDefault(); pick(p)"
            (mouseenter)="active.set(i)"
          >
            <app-icon name="pin" />
            <span><strong>{{ p.label }}</strong><small>{{ p.detail }}</small></span>
          </li>
        } @empty {
          <li class="empty">No places match “{{ lastQuery() }}”. Try a street and city.</li>
        }
      </ul>
    }
  `,
  styleUrl: './address-search.scss',
})
export class AddressSearch {
  private readonly geocoder = inject(GeocoderService);
  readonly near = input<LatLng>();
  readonly picked = output<Place>();

  protected readonly results = signal<Place[]>([]);
  protected readonly active = signal(-1);
  protected readonly open = signal(false);
  protected readonly busy = signal(false);
  protected readonly lastQuery = signal('');
  protected readonly query$ = new Subject<string>();
  private readonly inputEl = viewChild.required<ElementRef<HTMLInputElement>>('input');

  constructor() {
    this.query$
      .pipe(
        debounceTime(450), // Nominatim allows one request per second.
        distinctUntilChanged(),
        tap((q) => {
          if (q.trim().length < 3) {
            this.results.set([]);
            this.open.set(false);
          }
        }),
        filter((q) => q.trim().length >= 3),
        tap(() => this.busy.set(true)),
        switchMap((q) => {
          this.lastQuery.set(q.trim());
          return this.geocoder.search(q.trim(), this.near()).pipe(catchError(() => of([] as Place[])));
        }),
        takeUntilDestroyed(),
      )
      .subscribe((places) => {
        this.busy.set(false);
        this.results.set(places);
        this.active.set(places.length ? 0 : -1);
        this.open.set(true);
      });
  }

  protected onKey(e: KeyboardEvent): void {
    const n = this.results().length;
    if (e.key === 'ArrowDown' && n) {
      e.preventDefault();
      this.open.set(true);
      this.active.set((this.active() + 1) % n);
    } else if (e.key === 'ArrowUp' && n) {
      e.preventDefault();
      this.active.set((this.active() - 1 + n) % n);
    } else if (e.key === 'Enter' && this.open() && this.active() >= 0) {
      e.preventDefault();
      this.pick(this.results()[this.active()]);
    } else if (e.key === 'Escape') {
      this.open.set(false);
    }
  }

  protected pick(place: Place): void {
    this.picked.emit(place);
    this.open.set(false);
    this.results.set([]);
    this.inputEl().nativeElement.value = '';
    this.query$.next('');
  }

  protected close(): void {
    this.open.set(false);
  }
}
