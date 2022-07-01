import {
  Resolver,
  asClass,
  asFunction,
  asValue,
  createContainer,
} from 'awilix';
import * as bodyParser from 'body-parser';
import { compose } from 'compose-middleware';
import e from 'cors';
import cors from 'cors';
import express, { Express, Request, RequestHandler, Response } from 'express';
import { NextFunction } from 'express-serve-static-core';
import xmlBodyParser from 'express-xml-bodyparser';
import status from 'http-status-codes';
import pino, { Logger } from 'pino';
import swaggerUi from 'swagger-ui-express';
import { merge } from 'lodash';

// MAYBE WE NEED THIS ONE SOMEDAY
//import mirrorKeys from('object-key-mirror');
import { v4 } from 'uuid';

import defaultConfig from './constants/defaults';
import coreErrors from './constants/errors';
import {
  DefaultContainer,
  DefaultContainerAwilix,
  MiddlewareFactory,
  MiddlewareFunction,
  MiddlewareResult,
  Swaggen,
  SwaggenConfig,
  SwaggenOptions,
} from './interfaces';
import errorCreatorFactory, { ApiError, createError } from './lib/ApiError';
import executorFactory from './lib/executor';
import extractorFactory from './lib/extractor';
import restGeneratorFactory from './lib/restGenerator';
import defaultMiddlewares from './middlewares';

const packageJson = require('../package.json');
const defaultSwagger = require('./doc/swagger.json');

interface Dictionary<T> {
  [key: string]: T;
}

const logger = pino({
  level:
    process.env.NODE_ENV?.toLowerCase() === 'production' ? 'info' : 'debug',
});

export function swaggen<C extends DefaultContainer>({
  swagger,
  customMiddlewares = {},
  customServices = {},
  config,
}: SwaggenOptions<C>) {
  const container = createContainer();

  const combinedMiddlewares: Dictionary<MiddlewareFactory<C, any>> = {
    ...defaultMiddlewares,
    ...customMiddlewares,
  };

  const mergedConfig: SwaggenConfig = merge({}, defaultConfig, config);
  //@ts-ignore
  const dependencies: DefaultContainerAwilix = {
    coreAppConfig: asValue(mergedConfig),
    currentEnvironment: asValue(mergedConfig.currentEnvironment),
    STATUS: asValue(status),
    extractor: asFunction(extractorFactory),
    restGenerator: asFunction(restGeneratorFactory),
    app: asValue(express),
    compose: asValue(compose),
    createError: asFunction(errorCreatorFactory),
    swagger: asValue({
      paths: { ...swagger.paths, ...defaultSwagger.paths },
    }),
    coreErrors: asValue(coreErrors),
    logger: asValue(logger),
    executor: asFunction(executorFactory),
    uuidV4: asValue(v4),
    ApiError: asValue(ApiError),
    ...customServices,
  };

  Object.keys(combinedMiddlewares).map(m => {
    dependencies[m] = asFunction(combinedMiddlewares[m]);
    return true;
  });

  container.register(dependencies);

  const jsonBodyParser = bodyParser.json();
  const xmlBodyParserInited = xmlBodyParser();

  const xmlToJsonParser: RequestHandler = (request, response, nextCB) => {
    let body = '';
    request.on('data', data => {
      body += data;

      // Too much POST data, kill the connection!
      // 1e6 === 1 * Math.pow(10, 6) === 1 * 1000000 ~~~ 1MB
      if (body.length > 1e6) {
        response.status(status.BAD_REQUEST).send({
          error: 'stop flooding!',
        });
        request.socket.destroy();
      }
    });

    request.on('end', () => {
      try {
        request.body = JSON.parse(body);
        nextCB();
      } catch (err) {
        request.body = {};
        nextCB();
      }
    });
  };

  //@ts-ignore
  const app = (container.resolve('app') as Express)()
    .use('*', cors())
    .use('/doc', swaggerUi.serve, swaggerUi.setup(swagger))
    .use(
      '/api',
      (req: Request, res: Response, next: NextFunction) => {
        if (req.method !== 'GET' && req.method !== 'OPTIONS') {
          if (req.headers['content-type'] === 'application/xml') {
            return mergedConfig.parseXmlAsJSON
              ? xmlToJsonParser(req, res, next)
              : xmlBodyParserInited(req, res, next);
          }
          return jsonBodyParser(req, res, next);
        }
        return next();
      },
      container.resolve('restGenerator'),
    );

  app.use('/_health/ping', (req: Request, res: Response) => {
    res.status(200).send({
      message: 'pong',
    });
  });
  // todo add general error handler for normal express middlewares
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    const error = container.resolve<createError>('createError')({
      errorCode: coreErrors.middleware.uncatchedError,
      statusCode: status.INTERNAL_SERVER_ERROR,
      message: 'something went wrong',
    });
    logger.error({ error }, 'middleware has thrown an uncatched error');
    next(err);
  });
  const swaggenApp = app.listen(mergedConfig.port);
  swaggenApp.awilixContainer = container;
  swaggenApp.expressApp = app;
  return swaggenApp;
}

export { MiddlewareFactory, MiddlewareFunction, MiddlewareResult };

export { asFunction, asValue, asClass };
