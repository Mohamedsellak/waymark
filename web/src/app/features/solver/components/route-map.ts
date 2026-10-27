import { AfterViewInit, Component, ElementRef, OnDestroy, effect, inject, output, signal, viewChild } from '@angular/core';
import * as L from 'leaflet';
import { LatLng } from '@core/models/routing.model';
import { ThemeService } from '@core/services/theme.service';
import { Icon } from '@shared/components/icon';
import { routeColor } from '@shared/utils/route-colors';
import { SolverStore } from '../data-access/solver.store';

type BaseId = 'auto' | 'streets' | 'light' | 'dark' | 'satellite' | 'topo';

interface BaseMap {
  id: Exclude<BaseId, 'auto'>;
  name: string;
  url: string;
  attribution: string;
  maxZoom: number;
  swatch: string;
}

const OSM = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const BASES: BaseMap[] = [
  { id: 'light', name: 'Light', swatch: '#e9ecea', maxZoom: 16, url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', attribution: 'Tiles &copy; Esri, HERE, Garmin, &copy; OpenStreetMap contributors' },
  { id: 'dark', name: 'Dark', swatch: '#262b30', maxZoom: 16, url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', attribution: 'Tiles &copy; Esri, HERE, Garmin, &copy; OpenStreetMap contributors' },
  { id: 'streets', name: 'Streets', swatch: '#f2efe9', maxZoom: 19, url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: OSM },
  { id: 'topo', name: 'Terrain', swatch: '#c9d6a3', maxZoom: 17, url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', attribution: `${OSM}, SRTM | &copy; OpenTopoMap (CC-BY-SA)` },
  { id: 'satellite', name: 'Satellite', swatch: '#3d4a33', maxZoom: 19, url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics' },
];

const DEPOT_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 21V10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1v11"/><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35a2 2 0 0 1 1.26-1.86l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35z"/><path d="M6 13h12"/><path d="M6 17h12"/></svg>';

/** Map stage. Reads the plan from the store; reports clicks and marker drags. */
@Component({
  selector: 'app-route-map',
  imports: [Icon],
  templateUrl: './route-map.html',
  styleUrl: './route-map.scss',
})
export class RouteMap implements AfterViewInit, OnDestroy {
  protected readonly store = inject(SolverStore);
  private readonly theme = inject(ThemeService);

  readonly mapClick = output<LatLng>();

  protected readonly bases = BASES;
  protected readonly base = signal<BaseId>('auto');
  protected readonly layersOpen = signal(false);
  protected readonly locating = signal(false);

  private readonly host = viewChild.required<ElementRef<HTMLDivElement>>('host');
  private map?: L.Map;
  private tiles?: L.TileLayer;
  private readonly stopLayer = L.layerGroup();
  private readonly routeLayer = L.layerGroup();
  private readonly ready = signal(false);
  private lastFitKey = '';

  constructor() {
    effect(() => {
      if (!this.ready()) return;
      const id = this.base();
      const resolved = id === 'auto' ? (this.theme.isDark() ? 'dark' : 'light') : id;
      this.setTiles(BASES.find((b) => b.id === resolved)!);
    });
    effect(() => {
      if (!this.ready()) return;
      this.drawStops();
    });
    effect(() => {
      if (!this.ready()) return;
      this.drawRoutes();
    });
  }

  ngAfterViewInit(): void {
    const stops = this.store.stops();
    this.map = L.map(this.host().nativeElement, { zoomControl: false, attributionControl: true }).setView(
      stops[0] ? [stops[0].lat, stops[0].lng] : [33.5731, -7.5898],
      12,
    );
    L.control.scale({ imperial: false, position: 'bottomright' }).addTo(this.map);
    this.routeLayer.addTo(this.map);
    this.stopLayer.addTo(this.map);
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.layersOpen.set(false);
      this.mapClick.emit({ lat: e.latlng.lat, lng: e.latlng.lng });
    });
    this.ready.set(true);
    if (stops.length > 1) this.fitStops();
    setTimeout(() => this.map?.invalidateSize());
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  /** Pans to a point, e.g. after an address search. */
  flyTo(point: LatLng): void {
    this.map?.flyTo([point.lat, point.lng], Math.max(this.map.getZoom(), 15), { duration: 0.6 });
  }

  center(): LatLng | undefined {
    const c = this.map?.getCenter();
    return c ? { lat: c.lat, lng: c.lng } : undefined;
  }

  protected zoom(delta: number): void {
    this.map?.setZoom(this.map.getZoom() + delta);
  }

  protected fitStops(): void {
    const pts = this.store.stops().map((s) => L.latLng(s.lat, s.lng));
    if (pts.length === 1) this.map?.setView(pts[0], 14);
    else if (pts.length) this.map?.fitBounds(L.latLngBounds(pts), { padding: [60, 60], maxZoom: 15 });
  }

  protected locate(): void {
    if (!navigator.geolocation) return;
    this.locating.set(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.locating.set(false);
        this.map?.flyTo([pos.coords.latitude, pos.coords.longitude], 14, { duration: 0.6 });
      },
      () => this.locating.set(false),
      { timeout: 10000 },
    );
  }

  protected pickBase(id: BaseId): void {
    this.base.set(id);
    this.layersOpen.set(false);
  }

  protected baseActive(id: BaseId): boolean {
    return this.base() === id;
  }

  private setTiles(base: BaseMap): void {
    if (!this.map) return;
    this.tiles?.remove();
    this.tiles = L.tileLayer(base.url, {
      attribution: base.attribution,
      subdomains: 'abc',
      maxNativeZoom: base.maxZoom,
      maxZoom: 19,
    }).addTo(this.map);
    this.host().nativeElement.dataset['base'] = base.id;
  }

  private drawStops(): void {
    const stops = this.store.stops();
    const assignment = this.store.assignment();
    const hovered = this.store.hoveredStop();
    const focused = this.store.focused();
    this.stopLayer.clearLayers();

    stops.forEach((s, i) => {
      const depot = i === 0;
      const route = assignment.get(i);
      const color = route === undefined ? null : routeColor(route);
      const dim = focused !== null && route !== undefined && route !== focused;
      const cls = ['wm-pin', depot ? 'wm-pin-depot' : '', hovered === i ? 'is-hot' : '', dim ? 'is-dim' : ''].join(' ');
      const style = color ? `style="--pin:${color};--pin-fg:#fff"` : '';
      const icon = L.divIcon({
        className: 'wm-pin-wrap',
        html: `<span class="${cls}" ${style}>${depot ? DEPOT_SVG : i}</span>`,
        iconSize: depot ? [34, 34] : [28, 28],
        iconAnchor: depot ? [17, 17] : [14, 14],
      });
      const marker = L.marker([s.lat, s.lng], {
        icon,
        draggable: true,
        keyboard: true,
        title: depot ? 'Depot' : `Stop ${i}`,
        zIndexOffset: depot ? 1000 : hovered === i ? 900 : 0,
      });
      marker.bindTooltip(this.tooltip(i, s.label), { direction: 'top', offset: [0, -16] });
      marker.on('dragend', () => {
        const p = marker.getLatLng();
        this.store.moveStop(i, { lat: p.lat, lng: p.lng });
      });
      marker.on('contextmenu', () => this.store.removeStop(i));
      marker.on('mouseover', () => this.store.hoveredStop.set(i));
      marker.on('mouseout', () => this.store.hoveredStop.set(null));
      marker.addTo(this.stopLayer);
    });
  }

  private tooltip(i: number, label?: string): string {
    const title = i === 0 ? 'Depot' : `Stop ${i}`;
    const esc = (t: string) => t.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
    return label ? `<strong>${title}</strong><br>${esc(label)}` : `<strong>${title}</strong><br><span>Drag to move. Right-click to remove.</span>`;
  }

  private drawRoutes(): void {
    const geos = this.store.geometries();
    const hidden = this.store.hidden();
    const focused = this.store.focused();
    this.routeLayer.clearLayers();
    if (!geos.length || !this.map) return;

    const bounds = L.latLngBounds([]);
    geos.forEach((geo, i) => {
      if (hidden.has(i) || geo.path.length < 2) return;
      const pts = geo.path.map((p) => L.latLng(p.lat, p.lng));
      const isFocus = focused === i;
      const dim = focused !== null && !isFocus;
      // Casing under the ink line, as printed maps draw roads.
      L.polyline(pts, { color: '#ffffff', weight: isFocus ? 10 : 8, opacity: dim ? 0.25 : 0.9, interactive: false, className: 'wm-casing' }).addTo(this.routeLayer);
      L.polyline(pts, {
        color: routeColor(i),
        weight: isFocus ? 6 : 4.5,
        opacity: dim ? 0.3 : 1,
        dashArray: geo.onRoad ? undefined : '2 8',
        lineCap: 'round',
        className: 'wm-route',
      })
        .bindTooltip(`Route ${i + 1}`, { sticky: true })
        .on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          this.store.focusRoute(i);
        })
        .addTo(this.routeLayer);
      if (focused === null || isFocus) pts.forEach((p) => bounds.extend(p));
    });

    const key = `${geos.length}:${focused}`;
    if (bounds.isValid() && key !== this.lastFitKey) {
      this.lastFitKey = key;
      this.map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
    }
  }
}
