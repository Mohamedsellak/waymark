import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, timeout } from 'rxjs';
import { environment } from '@env/environment';
import { LatLng } from '@core/models/routing.model';
import { lang } from '@core/i18n/i18n';

export interface Place extends LatLng {
  label: string;
  detail: string;
}

interface NominatimAddress {
  road?: string;
  house_number?: string;
  neighbourhood?: string;
  suburb?: string;
  city_district?: string;
  city?: string;
  town?: string;
  village?: string;
}

interface NominatimResult {
  address?: NominatimAddress;
  lat: string;
  lon: string;
  name?: string;
  display_name: string;
}

@Injectable({ providedIn: 'root' })
export class GeocoderService {
  private readonly http = inject(HttpClient);

  search(query: string, near?: LatLng): Observable<Place[]> {
    const params: Record<string, string> = { q: query, format: 'jsonv2', limit: '6', 'accept-language': lang() };
    if (near) {
      // Prefer results around the current map view without excluding others.
      const d = 0.6;
      params['viewbox'] = [near.lng - d, near.lat + d, near.lng + d, near.lat - d].join(',');
    }
    return this.http.get<NominatimResult[]>(`${environment.geocoderUrl}/search`, { params }).pipe(
      map((rows) =>
        rows.map((r) => {
          const parts = r.display_name.split(', ');
          return {
            lat: Number(r.lat),
            lng: Number(r.lon),
            label: r.name || parts[0],
            detail: parts.slice(r.name ? 1 : 1, 4).join(', '),
          };
        }),
      ),
    );
  }

  /** Short human label for a point ("12 Rue X, Maârif"), or null. Never errors. */
  reverse(point: LatLng): Observable<string | null> {
    const params = { lat: String(point.lat), lon: String(point.lng), format: 'jsonv2', zoom: '18', addressdetails: '1', 'accept-language': lang() };
    return this.http.get<NominatimResult>(`${environment.geocoderUrl}/reverse`, { params }).pipe(
      timeout(8000),
      map((r) => {
        const a = r.address;
        if (!a) return r.display_name?.split(', ').slice(0, 2).join(', ') || null;
        const street = [a.house_number, a.road].filter(Boolean).join(' ');
        const area = a.neighbourhood || a.suburb || a.city_district || a.city || a.town || a.village;
        return [street || r.name, area].filter(Boolean).join(', ') || null;
      }),
      catchError(() => of(null)),
    );
  }
}
