/**
 * Static showcase blueprints for the public landing page (not loaded into projects).
 */

import { commerceExample } from './commerce';
import { contentEditorialExample } from './contentEditorial';
import { internalDirectoryExample } from './internalDirectory';
import { iotTelemetryExample } from './iotTelemetry';
import { saasBillingExample } from './saasBilling';
import type { LandingExample } from './types';

export type {
  LandingExample,
  LandingExampleEntity,
  LandingExampleOperation,
  LandingExampleRelation,
} from './types';

export const LANDING_EXAMPLES: LandingExample[] = [
  saasBillingExample,
  commerceExample,
  contentEditorialExample,
  iotTelemetryExample,
  internalDirectoryExample,
];
