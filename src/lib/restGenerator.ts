import { DefaultContainer } from '../interfaces';
import { RoutesToMiddlewares } from './extractor';

const restGenerator = (deps: DefaultContainer) => {
  const router = deps.app.Router();
  Object.keys(deps.extractor as RoutesToMiddlewares).map(path =>
    Object.keys(deps.extractor[path]).map(method => {
      const normalizedPath = path
        .split('/')
        .map(x => (x.startsWith('{') ? x.replace('{', ':').slice(0, -1) : x))
        .join('/');
      deps.logger.debug({ path: normalizedPath, method }, 'registered route');
      return router[method](
        normalizedPath,
        deps.executor([
          deps.log,
          ...deps.extractor[path][method].map((n: string) => deps[n]),
        ]),
      );
    }),
  );
  return router;
};

export default restGenerator;
