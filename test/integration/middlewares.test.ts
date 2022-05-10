/* eslint-disable max-classes-per-file */
/* eslint-disable no-use-before-define */
//@ts-nocheck
const nock = require('nock');

const request = require('supertest');
import coreErrors from '../../src/constants/errors';
import { swaggen, asFunction, DefaultContainer } from '../../src';

describe('test handling middleware functions', () => {
  let customMiddleware;
  let customMiddleware2;
  let app;
  const middleware2 = jest.fn();
  customMiddleware2 =
    ({ status: { OK } }) =>
    req => {
      req.state = OK;
      middleware2();
      return {
        message: 'pong',
      };
    };

  const coreConfig = {
    swagger: {
      paths: {
        '/count/{lol}/test': {
          get: {
            'x-middlewares': ['customMiddleware', 'customMiddleware2'],
          },
        },
      },
    },
    customServices: {},
    healthConfig: { services: [], name: 'test-app-name' },
    coreAppConfig: {
      appName: 'test-app-name',
      port: 3000,
      metrics: {
        usePrometheus: false,
        customPrefix: 'metric_prefix',
      },
      logger: {
        environment: 'TEST',
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    customMiddleware = () => () => {};
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
  it('Should return with forward data to next middleware and return 200', async () => {
    const data = {
      some: 'facts',
    };
    const data2 = {
      some2: 'facts2',
    };
    customMiddleware = () => () => {
      return {
        data,
      };
    };
    customMiddleware2 =
      ({ STATUS: { OK } }) =>
      req => {
        return {
          data: { ...req.locals, ...data2 },
          code: OK,
        };
      };
    coreConfig.customMiddlewares = { customMiddleware, customMiddleware2 };

    app = swaggen(coreConfig);

    const res = await request(app).get('/api/count/lol/test');
    expect(res.status).toEqual(200);
    expect(res.body).toEqual({ ...data, ...data2 });
  });
  it('Should return 500 if no code provided by last middleware ', async () => {
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

    const res = await request(app).get('/api/count/lol/test');
    expect(res.status).toEqual(500);
  });
  it('Should return 500 if first middleware threw error and not execute second one', async () => {
    const data = {
      some: 'facts',
    };
    customMiddleware = () => () => {
      throw new Error('ohoh');
    };
    coreConfig.customMiddlewares = {
      customMiddleware,
      customMiddleware2,
    };

    app = swaggen(coreConfig);

    const { status, body } = await request(app).get('/api/count/lol/test');
    expect(status).toEqual(500);

    expect(body).toEqual({
      code: 500,
      errorId: expect.any(String),
      name: coreErrors.middleware.executionError,
      trace: [coreErrors.middleware.executionError],
    });

    expect(middleware2).not.toHaveBeenCalled();
  });
  it('Should properly propagate error data and use initial error code and status', async () => {
    const errorDetails = {
      message: 'some error',
      errorCode: 'my error code',
      statusCode: 499,
      data: {
        some: {
          error: 'data',
        },
      },
    };
    customMiddleware = (container: DefaultContainer) => () => {
      throw container.throwError(errorDetails);
    };
    coreConfig.customMiddlewares = {
      customMiddleware,
      customMiddleware2,
    };

    app = swaggen(coreConfig);

    const { status, body } = await request(app).get('/api/count/lol/test');
    expect(status).toEqual(errorDetails.statusCode);

    expect(body).toEqual({
      code: errorDetails.statusCode,
      errorId: expect.any(String),
      name: coreErrors.middleware.executionError,
      trace: [coreErrors.middleware.executionError, errorDetails.errorCode],
      data: errorDetails.data,
    });

    expect(middleware2).not.toHaveBeenCalled();
  });
  it('Should return pong on a ping request (default middleware)', async () => {
    customMiddleware = (container: DefaultContainer) => () => {
      throw container.throwError(errorDetails);
    };
    coreConfig.customMiddlewares = {};
    coreConfig.swagger.paths = {};

    console.log(coreConfig);
    app = swaggen(coreConfig);

    const { status, body } = await request(app).get('/api/ping');
    console.log(body);
    expect(status).toEqual(200);

    expect(body).toEqual({
      message: 'pong',
    });
  });
  it('Should return pong on a ping request (health check server on same port)', async () => {
    customMiddleware = (container: DefaultContainer) => () => {
      throw container.throwError(errorDetails);
    };
    coreConfig.customMiddlewares = {};
    coreConfig.swagger.paths = {};

    console.log(coreConfig);
    app = swaggen(coreConfig);

    const { status, body } = await request(app).get('/_health/ping');
    console.log(body);
    expect(status).toEqual(200);

    expect(body).toEqual({
      message: 'pong',
    });
  });
});
