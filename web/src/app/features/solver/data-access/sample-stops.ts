import { Stop } from '@core/models/routing.model';

/** Synthetic demo: one depot and eleven deliveries across Casablanca. Windows in minutes since midnight. */
export const SAMPLE_STOPS: Stop[] = [
  { label: 'Depot, Aïn Sebaâ', lat: 33.6057, lng: -7.53, demand: 0, timeWindow: [420, 1140] },
  { label: 'Maârif', lat: 33.5806, lng: -7.6327, demand: 3, timeWindow: [480, 720] },
  { label: 'Gauthier', lat: 33.5915, lng: -7.629, demand: 2, timeWindow: [540, 780] },
  { label: 'Anfa', lat: 33.595, lng: -7.661, demand: 4, timeWindow: [600, 900] },
  { label: 'Sidi Maârouf', lat: 33.53, lng: -7.642, demand: 5, timeWindow: [480, 660] },
  { label: 'Bourgogne', lat: 33.5978, lng: -7.643, demand: 1, timeWindow: [720, 1020] },
  { label: 'Hay Hassani', lat: 33.56, lng: -7.68, demand: 3, timeWindow: [540, 840] },
  { label: 'Aïn Diab', lat: 33.592, lng: -7.69, demand: 2, timeWindow: [780, 1080] },
  { label: 'Derb Sultan', lat: 33.573, lng: -7.6, demand: 4, timeWindow: [480, 720] },
  { label: 'Hay Mohammadi', lat: 33.588, lng: -7.565, demand: 2, timeWindow: [600, 960] },
  { label: 'Oulfa', lat: 33.552, lng: -7.67, demand: 3, timeWindow: [660, 1020] },
  { label: 'Mers Sultan', lat: 33.585, lng: -7.613, demand: 1, timeWindow: [840, 1080] },
];
