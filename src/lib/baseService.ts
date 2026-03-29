export interface HealthCheckResult {
  service: string;
  healthy: boolean;
  details?: Record<string, unknown>;
}

export class ServiceError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    options?: {
      code?: string;
      status?: number;
      details?: Record<string, unknown>;
      cause?: unknown;
    },
  ) {
    super(message);
    this.name = 'ServiceError';
    this.code = options?.code ?? 'SERVICE_ERROR';
    this.status = options?.status ?? 500;
    this.details = {
      ...(options?.details ?? {}),
      ...(options?.cause !== undefined ? { cause: String(options.cause) } : {}),
    };
  }
}

export abstract class BaseService {
  abstract readonly serviceName: string;

  abstract healthCheck(): Promise<HealthCheckResult>;

  protected log(
    level: 'debug' | 'info' | 'warn' | 'error',
    ...args: unknown[]
  ) {
    const prefix = `[service:${this.serviceName}]`;
    const fn =
      level === 'error'
        ? console.error
        : level === 'warn'
        ? console.warn
        : level === 'debug'
        ? console.debug
        : console.log;
    fn(prefix, ...args);
  }

  protected healthy(details?: Record<string, unknown>): HealthCheckResult {
    return {
      service: this.serviceName,
      healthy: true,
      ...(details ? { details } : {}),
    };
  }

  protected unhealthy(details?: Record<string, unknown>): HealthCheckResult {
    return {
      service: this.serviceName,
      healthy: false,
      ...(details ? { details } : {}),
    };
  }

  protected ok(details?: Record<string, unknown>): HealthCheckResult {
    return this.healthy(details);
  }

  protected fail(details?: Record<string, unknown>): HealthCheckResult {
    return this.unhealthy(details);
  }

  protected async execute<T>(
    operation: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    const startedAt = Date.now();
    try {
      const result = await fn();
      this.log('debug', operation, 'ok', `${Date.now() - startedAt}ms`);
      return result;
    } catch (err) {
      const mapped = this.toServiceError(err);
      this.log('error', operation, mapped.code, mapped.message, mapped.details);
      throw mapped;
    }
  }

  protected async health(
    check: () => Promise<HealthCheckResult>,
  ): Promise<HealthCheckResult> {
    try {
      return await check();
    } catch (err) {
      const mapped = this.toServiceError(err);
      return this.fail({
        code: mapped.code,
        error: mapped.message,
        ...(mapped.details ?? {}),
      });
    }
  }

  protected requireEnv(name: string): string {
    const env = (globalThis as { process?: { env?: Record<string, string | undefined> } })
      .process?.env;
    const value = env?.[name];
    if (!value) {
      throw new ServiceError(`Missing required env var: ${name}`, {
        code: 'MISSING_ENV',
        status: 500,
        details: { env: name },
      });
    }
    return value;
  }

  protected toServiceError(err: unknown): ServiceError {
    if (err instanceof ServiceError) return err;
    if (err instanceof Error) {
      return new ServiceError(err.message, {
        code: 'UNEXPECTED_ERROR',
        status: 500,
        details: { name: err.name },
      });
    }
    return new ServiceError('Unknown service error', {
      code: 'UNKNOWN_ERROR',
      status: 500,
      details: { raw: String(err) },
    });
  }
}
