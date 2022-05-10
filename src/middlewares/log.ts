// @ts-nocheck

import { v4 as uuidV4 } from 'uuid';
import { Request } from 'express';
import { DefaultContainer } from 'src';

export default (container: DefaultContainer) => (req: Request) => {
  const {
    logger,
    throwError,
    STATUS: { BAD_REQUEST },
  } = container;
  req.executionTime = Date.now();
  if (req.query && req.query.requestId) {
    if (
      /^([a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12})$/.test(
        req.query.requestId,
      )
    ) {
      req.uuid = req.query.requestId;
    } else {
      req.state = BAD_REQUEST;
      // @ts-ignore
      throw throwError({});
    }
  } else {
    req.uuid = uuidV4();
  }
  const loggingContext = {
    requestId: req.uuid,
    params: { ...req.params },
    query: { ...req.query },
    path: req.route.path, // remove this once InfoSys is able to index logs correctly
    method: req.method, // remove this once InfoSys is able to index logs correctly
  };
  delete loggingContext.query.requestId;

  logger.info(
    'Request',
    {
      ...loggingContext,
      body: { ...req.body },
    },
    null,
    req,
  );
  return {
    localLogger: logger.child(loggingContext),
  };
};
