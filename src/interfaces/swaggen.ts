import { Resolver } from 'awilix';
import { Logger } from 'pino';
import { createError } from 'src/lib/ApiError';
import { v4 } from 'uuid';
import status from 'http-status-codes';
import { MiddlewareFactory, MiddlewareResult } from './middleware';

export interface SwaggenService {
  [key: string]: any;
}

export interface SwaggenConfig {
  [key: string]: any;
}

export interface SwaggenOptions<C> {
  swagger: any;
  customMiddlewares: {
    [key: string]: MiddlewareFactory<C, any>;
  };
  customServices: {
    [key: string]: Resolver<any>;
  };
}

export interface Swaggen<C> {
  (options: SwaggenOptions<C>): MiddlewareResult<T>;
}

export interface DefaultContainer {
  STATUS: typeof status;
  logger: Logger;
  errorHandler: Function;
  uuidV4: typeof v4;
  createError: createError;
  swagger: any;
  extractor: any;
  executor: any;
  app: any;
  coreErrors: any;
  [key: string]: any;
  coreAppConfig: SwaggenConfig;
}
