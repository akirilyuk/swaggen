import { DefaultContainer } from '../../src';
export interface RoutesToMiddlewares {
  [path: string]: { [verb: string]: string[] };
}
export default (container: DefaultContainer): RoutesToMiddlewares => {
  const { swagger } = container;
  const routes: RoutesToMiddlewares = {};
  Object.keys(swagger.paths).map((p: string) =>
    Object.keys(swagger.paths[p]).map((v: string) => {
      if (!routes[p]) {
        routes[p] = {};
      }
      if (routes[p] && !routes[p][v]) {
        routes[p][v] = [];
      }
      return swagger.paths[p][v]['x-middlewares'].map((t: string) =>
        routes[p][v].push(t),
      );
    }),
  );
  return routes;
};
