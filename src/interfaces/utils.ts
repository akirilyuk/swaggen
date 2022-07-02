import { Resolver } from 'awilix';

export type wrapAllKeysWithResovler<T, P> = {
  [K in keyof T]: Resolver<T[K]>;
};

export type makeAllKeysPrivateExceptSome<T, P extends keyof T> = Partial<T> &
  Pick<T, P>;
