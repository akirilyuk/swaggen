export interface MiddlewareResult<T> {
  code?: number;
  data?: T;
}

export interface MiddlewareFunction<T> {
  (req: Request): MiddlewareResult<T>;
}

export interface MiddlewareFactory<C, T> {
  (container: C): MiddlewareFunction<T>;
}

export interface SwaggenRequest extends Request {
  locals: { [key: string]: any };
}
