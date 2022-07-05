import { NextFunction, Response } from 'express';
import { Logger } from 'pino';

import {
  ApiError,
  DefaultContainer,
  MiddlewareFunction,
  SwaggenRequest,
} from '../interfaces';

const DEFAULT_CONTENT_TYPE = 'application/json';
const setHeaders = (req: SwaggenRequest, res: Response) => {
  res.set('Content-Type', DEFAULT_CONTENT_TYPE);

  if (req.setHeaders && typeof req.setHeaders === 'object') {
    Object.entries(req.setHeaders).forEach(([header, value]) => {
      res.set(header, value);
    });
  }
};

export default <C>(container: C & DefaultContainer) =>
  (middlewares: MiddlewareFunction[]) =>
  async (expressReq: Request, res: Response, next: NextFunction) => {
    let finalResult = null;
    let finalCode = 0;
    let allFinished = false;
    let error = null;

    const req = expressReq as unknown as SwaggenRequest;

    for (let i = 0; i < middlewares.length; i++) {
      try {
        container.logger.debug(
          { path: req.route.path },
          `executing middleware ${i}`,
        );
        const { code, data } = (await middlewares[i](req)) || {};
        if (code) {
          finalCode = code;
          finalResult = data;
          allFinished = true;
          break;
        }
        if (data && typeof data === 'object') {
          req.locals = { ...req.locals, ...data };
        }
      } catch (err) {
        error = container.createError({
          message: 'failed to execute middleware function',
          originalError: err,
          errorCode: container.coreErrors.middleware.executionError,
        });
        if (!(err instanceof ApiError)) {
          container.logger.error(
            { error },
            'middleware execution failed with unexpected error',
          );
        }
        break;
      }
      if (i === middlewares.length - 1) {
        allFinished = true;
      }
    }

    if (!error && !finalCode) {
      error = container.createError({
        message: 'app did not provide status code',
        originalError: {},
        errorCode: container.coreErrors.middleware.noStatusCode,
        statusCode: container.STATUS.INTERNAL_SERVER_ERROR,
      });
    }
    if (error) {
      finalResult = error.toExternalFormat();
      finalCode = error.statusCode;
    }
    setHeaders(req, res);

    res.status(finalCode as number).send(finalResult);

    if (container.coreAppConfig.logger?.enabled) {
      const logLevel =
        finalCode < 300 ? 'info' : finalCode < 500 ? 'warn' : 'error';

      let logData = {
        executionTime: Date.now() - req.executionStartTime,
        status: finalCode,
      };
      if (error) {
        //@ts-ignore
        logData.error = error;
      }
      (req.locals?.localLogger as unknown as Logger)[logLevel](
        logData,
        'request processed',
      );
    }

    return next();
  };
