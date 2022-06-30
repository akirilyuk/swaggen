import { NextFunction, Response } from 'express';

import {
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
  (middlewares: MiddlewareFunction<any>[]) =>
  async (req: SwaggenRequest, res: Response, next: NextFunction) => {
    let finalResult = null;
    let finalCode = null;
    let allFinished = false;
    let error = null;

    for (let i = 0; i < middlewares.length; i++) {
      try {
        const { code, data } = await middlewares[i](req);
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
        container.logger.error('middleware execution failed', error);
      }
      if (i === middlewares.length - 1) {
        allFinished = true;
      }
    }

    if (!finalCode) {
      error = container.createError({
        message: 'app did not provide status code',
        originalError: {},
        errorCode: container.coreErrors.middleware.noStatusCode,
        statusCode: container.STATUS.INTERNAL_SERVER_ERROR,
      });
    }
    if (error) {
      finalResult = error.toJSON();
      finalCode = error.code;
    }
    setHeaders(req, res);

    res.status(finalCode as number).send(finalResult);

    return next();
  };
