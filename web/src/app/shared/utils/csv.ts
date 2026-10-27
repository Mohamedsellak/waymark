import { Stop } from '@core/models/routing.model';
import { parseClock } from './geo';

const cell = (v: unknown): string => `"${String(v ?? '').replaceAll('"', '""')}"`;

export function toCsv(rows: unknown[][]): string {
  return rows.map((r) => r.map(cell).join(',')).join('\n');
}

export function downloadFile(name: string, content: string, type = 'text/csv'): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url));
}

/** Splits one CSV line, honouring quoted fields. */
function splitLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') quoted = false;
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) { out.push(cur.trim()); cur = ''; }
    else cur += c;
  }
  out.push(cur.trim());
  return out;
}

const ALIASES: Record<string, string[]> = {
  lat: ['lat', 'latitude', 'y'],
  lng: ['lng', 'lon', 'long', 'longitude', 'x'],
  label: ['label', 'name', 'address', 'stop', 'customer'],
  demand: ['demand', 'qty', 'quantity', 'load'],
  start: ['start', 'window_start', 'from', 'open'],
  end: ['end', 'window_end', 'to', 'close'],
};

export interface CsvImport {
  stops: Stop[];
  skipped: number;
}

/**
 * Reads stops from CSV. With a header row, columns are matched by name
 * (lat/latitude, lng/lon/longitude, label/name/address, demand, start, end as HH:MM or hours);
 * without one, the first two columns are lat, lng. Commas or semicolons.
 */
export function parseStopsCsv(text: string): CsvImport {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return { stops: [], skipped: 0 };

  const sep = (lines[0].match(/;/g)?.length ?? 0) > (lines[0].match(/,/g)?.length ?? 0) ? ';' : ',';
  const first = splitLine(lines[0], sep).map((h) => h.toLowerCase());
  const hasHeader = first.some((h) => isNaN(Number(h)) && h !== '');

  const col = (key: string, fallback: number) => {
    if (!hasHeader) return fallback;
    return first.findIndex((h) => ALIASES[key].includes(h));
  };
  const idx = { lat: col('lat', 0), lng: col('lng', 1), label: col('label', -1), demand: col('demand', -1), start: col('start', -1), end: col('end', -1) };

  const stops: Stop[] = [];
  let skipped = 0;
  for (const line of lines.slice(hasHeader ? 1 : 0)) {
    const f = splitLine(line, sep);
    const lat = Number(f[idx.lat]);
    const lng = Number(f[idx.lng]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      skipped++;
      continue;
    }
    const stop: Stop = { lat, lng };
    if (idx.label >= 0 && f[idx.label]) stop.label = f[idx.label];
    if (idx.demand >= 0 && f[idx.demand] !== '') stop.demand = Number(f[idx.demand]) || 0;
    if (idx.start >= 0 && idx.end >= 0) {
      const start = parseClock(f[idx.start] ?? '');
      const end = parseClock(f[idx.end] ?? '');
      if (start !== null && end !== null) stop.timeWindow = [start, end];
    }
    stops.push(stop);
  }
  return { stops, skipped };
}
