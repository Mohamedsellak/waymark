import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, timeout } from 'rxjs';
import { environment } from '@env/environment';
import { LatLng, RouteGeometry } from '@core/models/routing.model';
import { pathKm } from '@shared/utils/geo';

interface OsrmResponse {
  code: string;
  routes?: { distance: number; duration: number; geometry: { coordinates: [number, number][] } }[];
}

/** Assumed average urban speed when road routing is unavailable. */
const FALLBACK_KMH = 40;

/** Turns an ordered list of stops into a drivable path. Falls back to straight lines, never errors. */
@Injectable({ providedIn: 'root' })
export class RoadRouterService {
  private readonly http = inject(HttpClient);

  route(points: LatLng[]): Observable<RouteGeometry> {
    if (points.length < 2) return of(this.straight(points));
    const coords = points.map((p) => `${p.lng.toFixed(6)},${p.lat.toFixed(6)}`).join(';');
    return this.http
      .get<OsrmResponse>(`${environment.osrmUrl}/route/v1/driving/${coords}`, {
        params: { overview: 'full', geometries: 'geojson' },
      })
      .pipe(
        timeout(12000),
        map((res) => {
          const r = res.routes?.[0];
          if (res.code !== 'Ok' || !r) return this.straight(points);
          return {
            path: r.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })),
            distanceKm: r.distance / 1000,
            durationMin: r.duration / 60,
            onRoad: true,
          };
        }),
        catchError(() => of(this.straight(points))),
      );
  }

  private straight(points: LatLng[]): RouteGeometry {
    const km = pathKm(points);
    return { path: points, distanceKm: km, durationMin: (km / FALLBACK_KMH) * 60, onRoad: false };
  }
}
