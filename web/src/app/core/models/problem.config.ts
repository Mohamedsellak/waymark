import { MessageKey } from '@core/i18n/messages';
import { ProblemType } from './routing.model';

export interface ProblemConfig {
  type: ProblemType;
  /** Message keys; translate with `t()`. */
  title: MessageKey;
  description: MessageKey;
  multiVehicle: boolean;
  needsDemand: boolean;
  needsTimeWindow: boolean;
}

/** Single source of truth for what each problem needs from the user. */
export const PROBLEMS: Record<ProblemType, ProblemConfig> = {
  tsp: {
    type: 'tsp',
    title: 'problem.tsp.title',
    description: 'problem.tsp.description',
    multiVehicle: false,
    needsDemand: false,
    needsTimeWindow: false,
  },
  vrp: {
    type: 'vrp',
    title: 'problem.vrp.title',
    description: 'problem.vrp.description',
    multiVehicle: true,
    needsDemand: false,
    needsTimeWindow: false,
  },
  cvrp: {
    type: 'cvrp',
    title: 'problem.cvrp.title',
    description: 'problem.cvrp.description',
    multiVehicle: true,
    needsDemand: true,
    needsTimeWindow: false,
  },
  vrptw: {
    type: 'vrptw',
    title: 'problem.vrptw.title',
    description: 'problem.vrptw.description',
    multiVehicle: true,
    needsDemand: false,
    needsTimeWindow: true,
  },
};

export const PROBLEM_LIST = Object.values(PROBLEMS);
