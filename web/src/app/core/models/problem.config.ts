import { ProblemType } from './routing.model';

export interface ProblemConfig {
  type: ProblemType;
  title: string;
  description: string;
  multiVehicle: boolean;
  needsDemand: boolean;
  needsTimeWindow: boolean;
}

/** Single source of truth for what each problem needs from the user. */
export const PROBLEMS: Record<ProblemType, ProblemConfig> = {
  tsp: {
    type: 'tsp',
    title: 'Travelling Salesman (TSP)',
    description: 'One vehicle visits every stop once and returns to the depot.',
    multiVehicle: false,
    needsDemand: false,
    needsTimeWindow: false,
  },
  vrp: {
    type: 'vrp',
    title: 'Vehicle Routing (VRP)',
    description: 'Several vehicles share the stops, balancing route lengths.',
    multiVehicle: true,
    needsDemand: false,
    needsTimeWindow: false,
  },
  cvrp: {
    type: 'cvrp',
    title: 'Capacitated VRP (CVRP)',
    description: 'Vehicles have a capacity and every stop has a demand.',
    multiVehicle: true,
    needsDemand: true,
    needsTimeWindow: false,
  },
  vrptw: {
    type: 'vrptw',
    title: 'VRP with Time Windows (VRPTW)',
    description: 'Every stop must be served within its time window.',
    multiVehicle: true,
    needsDemand: false,
    needsTimeWindow: true,
  },
};

export const PROBLEM_LIST = Object.values(PROBLEMS);
