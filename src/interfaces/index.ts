import {
  MiddlewareFactory,
  MiddlewareFunction,
  MiddlewareResult,
  SwaggenRequest,
} from './middleware';

import {
  DefaultContainer,
  Swaggen,
  SwaggenConfig,
  SwaggenOptions,
  SwaggenService,
  SwaggenServerInstance,
} from './swaggen';

import { wrapAllKeysWithResovler, makeAllKeysPrivateExceptSome } from './utils';

import { ApiError, ApiErrorExternal, ApiErrorInterface } from './errors';

import { swaggenErrors, defaultConfig } from '../constants';

// Middleware logic and handling
export {
  MiddlewareFactory,
  MiddlewareResult,
  SwaggenRequest,
  MiddlewareFunction,
};

// main application
export {
  SwaggenService,
  SwaggenConfig,
  SwaggenOptions,
  SwaggenServerInstance,
  Swaggen,
  DefaultContainer,
};

// utils
export { wrapAllKeysWithResovler, makeAllKeysPrivateExceptSome };

// defaults
export { swaggenErrors, defaultConfig };

// errors
export { ApiError, ApiErrorExternal, ApiErrorInterface };
