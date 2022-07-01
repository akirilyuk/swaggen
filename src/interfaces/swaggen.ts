import { Resolver } from 'awilix';
import status from 'http-status-codes';
import { Logger } from 'pino';
import { createError } from 'src/lib/ApiError';
import { v4 } from 'uuid';

import { MiddlewareFactory, MiddlewareFunction } from './middleware';
import swaggenErrors from './../constants/errors';

export type addPrefixToObject<T, P extends string> = {
  [K in keyof T]: Resolver<T[K]>;
};
export interface SwaggenService {
  [key: string]: any;
}

export interface SwaggenConfig {
  [key: string]: any;
  logger?: {
    enabled?: boolean;
    logRequestBody?: boolean;
  };
  currentEnvironment?: string;
  port?: number;
  parseXmlAsJSON?: boolean;
}

export interface SwaggenOptions<C> {
  swagger: any;
  customMiddlewares: {
    [key: string]: MiddlewareFactory<C, any>;
  };
  customServices: {
    [key: string]: Resolver<any>;
  };
  config: SwaggenConfig;
}

export interface Swaggen<C> {
  (options: SwaggenOptions<C>): {};
}
export interface DefaultMiddlewares {
  log: MiddlewareFunction<{ localLogger: Logger }>;
  ping: MiddlewareFunction<void>;
}
export interface DefaultContainer extends DefaultMiddlewares {
  STATUS: typeof status;
  logger: Logger;
  errorHandler: Function;
  uuidV4: typeof v4;
  createError: createError;
  swagger: any;
  extractor: any;
  executor: any;
  app: any;
  coreErrors: typeof swaggenErrors;
  coreAppConfig: SwaggenConfig;
  [key: string]: any;
}

export type DefaultContainerAwilix = addPrefixToObject<
  DefaultContainer,
  'Resolver'
>;
