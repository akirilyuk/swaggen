export default {
  middleware: {
    executionError: 'swaggen.error.middleware.execution',
    noStatusCode: 'swaggen.error.middleware.no-status-code',
    uncatchedError: 'swaggen.error.middleware.uncatched-error',
    log: {
      malformedRequestId: 'swaggen.error.middleware.malformed-request-id',
    },
  },
  service: {
    health: {
      timeout: 'swaggen.error.service.health.timeout',
      failure: 'swaggen.error.service.health.failure',
    },
  },
};
