/* eslint-disable max-classes-per-file */
/* eslint-disable no-use-before-define */
//@ts-nocheck
const nock = require('nock');

const request = require('supertest');
import coreErrors from '../../src/constants/errors';
import {
  swaggen,
  asFunction,
  DefaultContainer,
  MiddlewareFactory,
  MiddlewareFunction,
} from '../../src';
import { StatusCodes as HTTP_STATUS } from 'http-status-codes';

describe('test handling middleware functions', () => {
  let customMiddleware;
  let customMiddleware2;
  let app;
  const middleware2 = jest.fn();

  interface ExternalDependency {
    doStuff: () => string;
  }
  interface DoThingsService {
    doThings: () => any;
  }

  interface TestContainer extends DefaultContainer {
    doThingsService: DoThingsService;
    externalDependency: ExternalDependency;
  }

  const doThingsServiceFactory = ({
    externalDependency,
  }: TestContainer): DoThingsService => ({
    doThings: () => {
      return externalDependency.doStuff() + 'I have added another output here';
    },
  });

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
    customMiddlewares: {},
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
  it('should return a 200 OK with an empty response if middleware completed without any issue', async () => {
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
  it('should return a 500 ERROR if no status code was provided by last middleware', async () => {
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
});
