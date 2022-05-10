import { DefaultContainer } from 'src';

const restGenerator = (deps: DefaultContainer) => {
  const router = deps.app.Router();
  Object.keys(deps.extractor).map(p =>
    Object.keys(deps.extractor[p]).map(v =>
      router[v](
        p
          .split('/')
          .map(x => (x.startsWith('{') ? x.replace('{', ':').slice(0, -1) : x))
          .join('/'),
        deps.executor(deps.extractor[p][v].map((n: string) => deps[n])),
      ),
    ),
  );
  return router;
};

export default restGenerator;
