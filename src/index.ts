//@ts-nocheck
import { createContainer, asFunction, asClass, asValue } from 'awilix';
import express from 'express';
import swaggerUi from 'swagger-ui-express';

// MAYBE WE NEED THIS ONE SOMEDAY
//import mirrorKeys from('object-key-mirror');
import { compose } from 'compose-middleware';
import xmlBodyParser from 'express-xml-bodyparser';
import * as bodyParser from 'body-parser';
import cors from 'cors';
import status from 'http-status-codes';
import extractor from './lib/extractor';
import restGenerator from './lib/restGenerator';
import defaultMiddlewares from './middlewares';
const defaultSwagger = require('./doc/swagger.json');
import coreErrors from './constants/errors';
import defaultConfig from './constants/defaults';
const packageJson = require('../package.json');
import pino, { Logger } from 'pino';
import executor from './lib/executor';
import throwError, { ApiError, createError } from './lib/ApiError';
import { v4 } from 'uuid';
import { MiddlewareFactory } from './middlewares/middleware';

const logger = pino();

export interface DefaultContainer {
  STATUS: typeof status;
  logger: Logger;
  errorHandler: Function;
  uuidV4: v4;
  throwError: createError;
  swagger: any;
  extractor: any;
  executor: any;
  app: any;
  [key: string]: MiddlewareFactory;
  coreErrors: any;
}

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
    extractor: asFunction(extractor),
    restGenerator: asFunction(restGenerator),
    app: asValue(express),
    compose: asValue(compose),
    throwError: asFunction(throwError),
    swagger: asValue({
      paths: { ...swagger.paths, ...defaultSwagger.paths },
    }),
    coreErrors: asValue(coreErrors),
    logger: asValue(logger),
    executor: asFunction(executor),
    uuidV4: asValue(v4),
    ApiError: asFunction(ApiError),
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

  const app = container
    .resolve('app')()
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
  const swaggenApp = app.listen(mergedConfig.port);
  swaggenApp.awilixContainer = container;
  swaggenApp.expressApp = app;
  return swaggenApp;
};

export { asFunction, asValue, asClass };
