//@ts-nocheck
import { createContainer, asFunction, asClass, asValue } from 'awilix';
import express from 'express';
import swaggerUi from 'swagger-ui-express';

import status from 'http-status-codes';

// MAYBE WE NEED THIS ONE SOMEDAY
//import mirrorKeys from('object-key-mirror');
import { compose } from 'compose-middleware';
import xmlBodyParser from 'express-xml-bodyparser';
import * as bodyParser from 'body-parser';
import cors from 'cors';

import extractorFactory from './lib/extractor';
import restGeneratorFactory from './lib/restGenerator';
import defaultMiddlewares from './middlewares';
const defaultSwagger = require('./doc/swagger.json');
import coreErrors from './constants/errors';
import defaultConfig from './constants/defaults';
const packageJson = require('../package.json');
import pino, { Logger } from 'pino';
import executorFactory from './lib/executor';
import errorCreatorFactory from './lib/ApiError';
import { ApiError } from './lib/ApiError';
import { v4 } from 'uuid';
import {
  MiddlewareFactory,
  MiddlewareFunction,
  MiddlewareResult,
} from './interfaces';

const logger = pino({
  level:
    process.env.NODE_ENV?.toLowerCase() === 'production' ? 'info' : 'debug',
});

export const swaggen = ({
  swagger,
  customMiddlewares = {},
  customServices,
  healthConfig,
  coreAppConfig,
}) => {
  const container = createContainer();

  const combinedMiddlewares = { ...defaultMiddlewares, ...customMiddlewares };

  const mergedConfig = {
    ...defaultConfig,
    ...coreAppConfig,
  };
  const config = {
    coreAppConfig: asValue(mergedConfig),
    coreHealthConfig: asValue(healthConfig),
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
    config[m] = asFunction(combinedMiddlewares[m]);
    return true;
  });

  container.register(config);

  const jsonBodyParser = bodyParser.json();
  const xmlBodyParserInited = xmlBodyParser();

  const xmlToJsonParser = (request, response, nextCB) => {
    let body = '';
    request.on('data', data => {
      body += data;

      // Too much POST data, kill the connection!
      // 1e6 === 1 * Math.pow(10, 6) === 1 * 1000000 ~~~ 1MB
      if (body.length > 1e6) {
        response.status = 400;
        response.send({
          error: 'stop flooding!',
        });
        request.connection.destroy();
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

  const app = (container.resolve('app') as Express)()
    .use('*', cors())
    .use('/doc', swaggerUi.serve, swaggerUi.setup(swagger))
    .use(
      '/api',
      (req, res, next) => {
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

  app.use('/_health/ping', (req, res) => {
    res.status = 200;
    res.send({
      message: 'pong',
    });
  });
  // todo add general error handler for normal express middlewares
  app.use((err, req, res, next) => {
    const error = throwError();
    logger.error({ errorMessage: err.message });
    next(err);
  });
  const swaggenApp = app.listen(mergedConfig.port);
  swaggenApp.awilixContainer = container;
  swaggenApp.expressApp = app;
  return swaggenApp;
};

export { MiddlewareFactory, MiddlewareFunction, MiddlewareResult };

export { asFunction, asValue, asClass };
