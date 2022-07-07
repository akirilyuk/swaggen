import { Logger } from 'pino';
import { Cache, CacheContainer } from 'node-ts-cache';
import { MemoryStorage } from 'node-ts-cache-storage-memory';

import { DefaultContainer, SwaggenErrors } from './swaggen';
import { createError } from 'src/lib/ApiError';

/**
 * Configuration parameters to be used for the service health optons
 */
export interface ServiceHealthConfig {
  name: string;
  version: string;
  mandatory: boolean;
  description?: string;
}

export enum SERVICE_HEALTH_STATE {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
  UNKNOWN = 'UNKNOWN',
}

export interface TestResult {
  start: number;
  end: number;
  duration: number;
  status: SERVICE_HEALTH_STATE;
  error?: string;
}

export interface ServiceTestResult extends ServiceHealthConfig, TestResult {}

export interface ContainerTestResult {
  services: ServiceTestResult[];
  status: SERVICE_HEALTH_STATE;
}

/**
 * Testable Service interface
 */
export interface TestableService {
  serviceHealthConfig: ServiceHealthConfig;
  test(): Promise<any | boolean>;
}

export interface TestableServiceEntry {
  service: TestableService;
  lastResult?: TestResult;
}
