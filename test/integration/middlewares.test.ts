/* eslint-disable max-classes-per-file */
/* eslint-disable no-use-before-define */
import { BAD_REQUEST, StatusCodes as HTTP_STATUS } from 'http-status-codes';
import {
  ApiError,
  ApiErrorExternal,
  ApiErrorInterface,
  SwaggenOptions,
  SwaggenServerInstance,
} from 'src/interfaces';

import swaggen, {
  DefaultContainer,
  MiddlewareFactory,
  MiddlewareFunction,
  asFunction,
  SwaggenConfig,
  asValue,
} from '../../src';
import coreErrors from '../../src/constants/errors';

const nock = require('nock');
const request = require('supertest');

describe('test handling middleware functions', () => {
  let app: SwaggenServerInstance;
  const middleware2 = jest.fn();
  interface ExternalDependency {
    doStuff: () => string;
  }
  interface DoThingsService {
    doThings: (error?: ApiErrorInterface) => any;
  }

  interface TestContainer extends DefaultContainer {
    doThingsService: DoThingsService;
    externalDependency: ExternalDependency;
  }

  const doThingsServiceFactory = ({
    externalDependency,
    createError,
  }: TestContainer): DoThingsService => ({
    doThings: errorToThrow => {
      if (errorToThrow) {
        throw createError(errorToThrow);
      }
      return externalDependency.doStuff() + 'I have added another output here';
    },
  });

  const externalDependencyLibrary: ExternalDependency = {
    doStuff: () => {
      return 'some stuff';
    },
  };

  let customMiddleware: MiddlewareFactory<TestContainer>;
  let customMiddleware2: MiddlewareFactory<TestContainer>;

  const coreConfig: SwaggenOptions<TestContainer> = {
    swagger: {
      paths: {
        '/count/{lol}/test': {
          get: {
            'x-middlewares': ['customMiddleware', 'customMiddleware2'],
          },
        },
      },
    },
    customServices: {
      doThingsService: asFunction<DoThingsService>(
        doThingsServiceFactory,
      ).singleton(),
      externalDependency: asValue<ExternalDependency>(
        externalDependencyLibrary,
      ),
    },
    config: {
      appName: 'test-app-name',
      port: 3000,
      metrics: {
        usePrometheus: false,
        customPrefix: 'metric_prefix',
      },
      logger: {
        enabled: true,
      },
    },
    customMiddlewares: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
    customMiddleware = () => () => ({});
  });
  afterEach(async () => {
    await new Promise(resolve => {
      if (app) {
        app.close(() => {
          resolve('');
        });
      } else {
        resolve('');
      }
    });
  });
  it('should return a 200 OK with an data from last middleware on success', async () => {
    customMiddleware = () => () => {
      return {};
    };
    customMiddleware2 =
      ({ STATUS: { OK } }) =>
      req => {
        return { code: OK };
      };
    coreConfig.customMiddlewares = { customMiddleware, customMiddleware2 };

    app = swaggen(coreConfig);

    const { body, status } = await request(app).get('/api/count/lol/test');
    expect(status).toEqual(HTTP_STATUS.OK);
    expect(body).toEqual('');
  });
  it('should return a 200 OK with an empty response if middleware completed without any issue', async () => {
    const data = {
      some: 'facts',
    };
    customMiddleware = () => () => {
      return {};
    };
    customMiddleware2 =
      ({ STATUS: { OK } }) =>
      req => {
        return { code: OK, data };
      };
    coreConfig.customMiddlewares = { customMiddleware, customMiddleware2 };

    app = swaggen(coreConfig);

    const { body, status } = await request(app).get('/api/count/lol/test');
    expect(status).toEqual(HTTP_STATUS.OK);
    expect(body).toEqual(data);
  });
  it('should return a 500 ERROR if no status code was provided by any middleware', async () => {
    const data = {
      some: 'facts',
    };
    customMiddleware = () => () => {
      return {
        data,
      };
    };
    customMiddleware2 =
      ({ STATUS: { OK } }) =>
      req => {
        return {};
      };
    coreConfig.customMiddlewares = { customMiddleware, customMiddleware2 };

    app = swaggen(coreConfig);

    const { body, status } = await request(app).get('/api/count/lol/test');
    expect(status).toEqual(500);
    expect(body).toMatchObject({
      name: coreErrors.middleware.noStatusCode,
      code: 500,
    });
  });
  it('should return a 400 ERROR and not execute second middleware if first has thrown a 400 error', async () => {
    const data = {
      some: 'facts',
    };
    const errorCode = 'test error name';
    const expectedError: ApiErrorExternal = {
      code: HTTP_STATUS.BAD_REQUEST,
      name: errorCode,
      errorId: expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      ),
      trace: expect.arrayContaining([errorCode]),
    };
    const customMiddleware2Mock = jest.fn();
    customMiddleware =
      ({ STATUS: { BAD_REQUEST }, createError }) =>
      () => {
        throw createError({
          statusCode: BAD_REQUEST,
          message: 'opps',
          errorCode,
        });
      };
    customMiddleware2 = () => customMiddleware2Mock;
    coreConfig.customMiddlewares = { customMiddleware, customMiddleware2 };

    app = swaggen(coreConfig);

    const { body, status } = await request(app).get('/api/count/lol/test');
    console.log(body);
    expect(status).toEqual(400);
    expect(body).toMatchObject(expectedError);
  });
});
