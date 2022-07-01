import { DefaultContainer, SwaggenRequest } from '../interfaces';

export default ({
    logger,
    createError,
    STATUS: { BAD_REQUEST },
    coreErrors,
    uuidV4,
    coreAppConfig,
  }: DefaultContainer) =>
  (req: SwaggenRequest) => {
    req.executionStartTime = Date.now();
    if (req.query && req.query.requestId) {
      if (
        /^([a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12})$/.test(
          req.query.requestId as string,
        )
      ) {
        req.uuid = req.query.requestId as string;
      } else {
        // @ts-ignore
        throw createError({
          message: 'provided request id does not match uuid format',
          errorCode: coreErrors.middleware.log.malformedRequestId,
          statusCode: BAD_REQUEST,
        });
      }
    } else {
      req.uuid = uuidV4();
    }
    const loggingContext = {
      requestId: req.uuid,
      params: { ...req.params },
      query: { ...req.query },
      path: req.route.path,
      method: req.method,
    };
    delete loggingContext.query.requestId;

    logger.info(
      coreAppConfig.logger?.logRequestBody
        ? {
            ...loggingContext,
            body: req.body,
          }
        : loggingContext,
      'request received',
    );
    return {
      data: {
        localLogger: logger.child(loggingContext),
      },
    };
  };
