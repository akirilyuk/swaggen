import { Cache, CacheContainer } from 'node-ts-cache';
import { MemoryStorage } from 'node-ts-cache-storage-memory';
import { Logger } from 'pino';
import { DefaultContainer } from 'src/interfaces';
import {
  ContainerTestResult,
  ServiceTestResult,
  SERVICE_HEALTH_STATE,
  TestableService,
  TestableServiceEntry,
} from 'src/interfaces/health';
import { SwaggenErrors } from 'src/interfaces/swaggen';
import { createError } from 'src/lib/ApiError';

const serviceTestResultsCache = new CacheContainer(new MemoryStorage());
function isTestableService(object: unknown): object is TestableService {
  return (
    Object.prototype.hasOwnProperty.call(object, 'serviceHealthConfig') &&
    Object.prototype.hasOwnProperty.call(object, 'test') &&
    (object as TestableService).serviceHealthConfig.name?.length > 0 &&
    (object as TestableService).serviceHealthConfig.version?.length > 0 &&
    typeof (object as TestableService).serviceHealthConfig.mandatory ===
      'boolean'
  );
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
          status: SERVICE_HEALTH_STATE.UNKNOWN,
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
      status: error
        ? SERVICE_HEALTH_STATE.FAILURE
        : SERVICE_HEALTH_STATE.SUCCESS,
    };
    if (error) {
      result.error = error.message;
    }
    return result;
  }

  @Cache(serviceTestResultsCache, { ttl: 30 })
  async testAllServices(): Promise<ContainerTestResult> {
    const results = await Promise.all(
      this.servicesToTest.map(service => this.testService(service)),
    );

    const hasMandatoryDependencyFailure = results.find(
      ({ status: result, mandatory }) =>
        result === SERVICE_HEALTH_STATE.FAILURE && mandatory,
    );

    return {
      services: results,
      status: hasMandatoryDependencyFailure
        ? SERVICE_HEALTH_STATE.FAILURE
        : SERVICE_HEALTH_STATE.SUCCESS,
    };
  }
}
