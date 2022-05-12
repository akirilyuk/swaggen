export default {
  appName: 'default-app-name',
  port: 3000,
  currentEnvironment: 'DEVELOPMENT',
  corsWhitelist: process.env.CORS_WHITELIST ? process.env.CORS_WHITELIST : [],
  metrics: {
    usePrometheus: false,
  },
  logger: {
    forbiddenDataKeys: ['example'],
  },
  parseXmlAsJSON: false,
  gatekeeper: {
    enabled: false,
  },
};
