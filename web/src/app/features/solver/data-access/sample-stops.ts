import { Stop } from '@core/models/routing.model';

/** Synthetic demo: one depot and eleven deliveries across Paris. Windows in minutes since midnight. */
export const SAMPLE_STOPS: Stop[] = [
  { label: 'Depot, Rungis', lat: 48.7466, lng: 2.3524, demand: 0, timeWindow: [420, 1140] },
  { label: 'Le Marais', lat: 48.859, lng: 2.3622, demand: 3, timeWindow: [480, 720] },
  { label: 'Montmartre', lat: 48.8867, lng: 2.3431, demand: 2, timeWindow: [540, 780] },
  { label: 'Saint-Germain-des-Prés', lat: 48.854, lng: 2.3337, demand: 4, timeWindow: [600, 900] },
  { label: 'Bastille', lat: 48.8532, lng: 2.3692, demand: 5, timeWindow: [480, 660] },
  { label: 'Belleville', lat: 48.8722, lng: 2.3767, demand: 1, timeWindow: [720, 1020] },
  { label: 'Montparnasse', lat: 48.8421, lng: 2.3219, demand: 3, timeWindow: [540, 840] },
  { label: 'Batignolles', lat: 48.8866, lng: 2.317, demand: 2, timeWindow: [780, 1080] },
  { label: 'Passy', lat: 48.8576, lng: 2.2786, demand: 4, timeWindow: [480, 720] },
  { label: 'Bercy', lat: 48.8355, lng: 2.3826, demand: 2, timeWindow: [600, 960] },
  { label: 'Butte-aux-Cailles', lat: 48.827, lng: 2.35, demand: 3, timeWindow: [660, 1020] },
  { label: 'Canal Saint-Martin', lat: 48.871, lng: 2.365, demand: 1, timeWindow: [840, 1080] },
];
