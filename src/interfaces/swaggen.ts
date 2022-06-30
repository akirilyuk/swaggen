import { Resolver } from 'awilix';
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
