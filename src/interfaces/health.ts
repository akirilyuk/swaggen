import { Logger } from 'pino';
import { Cache, CacheContainer } from 'node-ts-cache';
import { MemoryStorage } from 'node-ts-cache-storage-memory';

const serviceTestResultsCache = new CacheContainer(new MemoryStorage());
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

export function isTestableService(object: unknown): object is TestableService {
  return (
    Object.prototype.hasOwnProperty.call(object, 'serviceHealthConfig') &&
    Object.prototype.hasOwnProperty.call(object, 'test') &&
    (object as TestableService).serviceHealthConfig.name?.length > 0 &&
    (object as TestableService).serviceHealthConfig.version?.length > 0 &&
    typeof (object as TestableService).serviceHealthConfig.mandatory ===
      'boolean'
  );
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
  result: SERVICE_HEALTH_STATE;
  error?: string;
}

export interface ServiceTestResult extends ServiceHealthConfig, TestResult {}

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

export class ServiceHealthTester<C extends DefaultContainer> {
  servicesToTest: TestableServiceEntry[];
  logger: Logger;
  createError: createError;
  coreErrors: SwaggenErrors;
  constructor(container: C) {
    // we can also just use node cahe with an expiring cache so when we get a request we either do a new request to test,
    // or get the data from the cache
    this.logger = container.logger;
    this.createError = container.createError;
    this.coreErrors = container.coreErrors;
    this.servicesToTest = Object.values(container)
      .filter(dependency => {
        if (isTestableService(dependency)) {
          this.logger.debug(
            {
              serviceHealthConfig: dependency.serviceHealthConfig,
            },
            'adding service to health check service',
          );
          return true;
        }
        return false;
      })
      .map(dependency => ({
        service: dependency,
        lastResult: {
          start: Date.now(),
          end: Date.now(),
          result: SERVICE_HEALTH_STATE.UNKNOWN,
          duration: 0,
        },
      }));
    container.logger.debug('started health check service');
  }

  async testService(
    serviceEntry: TestableServiceEntry,
  ): Promise<ServiceTestResult> {
    const start = Date.now();
    let error;
    try {
      await new Promise(async (resolve, reject) => {
        const testTimeout = setTimeout(() => {
          reject(
            this.createError({
              message: 'health check timed out',
              errorCode: this.coreErrors.service.health.timeout,
            }),
          );
        }, 10000);
        try {
          await serviceEntry.service.test();
          resolve({});
        } catch (err) {
          this.logger.error(
            {
              serviceHealthConfig: serviceEntry.service.serviceHealthConfig,
              errorMessage: (err as Error)?.message,
            },
            'health check run failed!',
          );
          throw err;
        } finally {
          clearTimeout(testTimeout);
        }
      });
    } catch (err) {
      error = this.createError({
        originalError: error,
        errorCode: this.coreErrors.service.health.failure,
        message: 'health check failed!',
      });
    }

    const end = Date.now();
    const duration = end - start;

    const result: ServiceTestResult = {
      ...serviceEntry.service.serviceHealthConfig,
      start,
      end,
      duration,
      result: error
        ? SERVICE_HEALTH_STATE.FAILURE
        : SERVICE_HEALTH_STATE.SUCCESS,
    };
    if (error) {
      result.error = error.message;
    }
    return result;
  }

  @Cache(serviceTestResultsCache, { ttl: 30 })
  async testAllServices() {}
}
