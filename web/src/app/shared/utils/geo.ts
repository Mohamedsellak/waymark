import { LatLng } from '@core/models/routing.model';

const R = 6371;
const rad = (d: number) => (d * Math.PI) / 180;

export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function pathKm(points: LatLng[]): number {
  let km = 0;
  for (let i = 1; i < points.length; i++) km += haversineKm(points[i - 1], points[i]);
  return km;
}

export const formatKm = (km: number): string => (km < 10 ? km.toFixed(1) : Math.round(km).toLocaleString()) + ' km';

export function formatDuration(min: number): string {
  const m = Math.round(min);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h} h ${String(m % 60).padStart(2, '0')}`;
}

export const formatCoord = ({ lat, lng }: LatLng): string => `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

/** Minutes since midnight → "HH:MM". */
export function formatClock(min: number): string {
  const m = Math.max(0, Math.min(1440, Math.round(min)));
  return `${String(Math.floor(m / 60) % 25).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** "HH:MM" (or a bare hour like "8" / "8.5") → minutes since midnight, or null. */
export function parseClock(value: string): number | null {
  const v = value.trim();
  const hm = /^(\d{1,2}):(\d{2})$/.exec(v);
  if (hm) {
    const h = Number(hm[1]), m = Number(hm[2]);
    return h <= 24 && m < 60 && h * 60 + m <= 1440 ? h * 60 + m : null;
  }
  const h = Number(v);
  return v !== '' && Number.isFinite(h) && h >= 0 && h <= 24 ? Math.round(h * 60) : null;
}
