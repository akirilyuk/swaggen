import { Request } from 'express';
export interface MiddlewareResult<T> {
  code?: number;
  data?: T;
}

export interface MiddlewareFunction<T = any | void> {
  (req: SwaggenRequest): MiddlewareResult<T>;
}

export interface MiddlewareFactory<C, T = any | void> {
  (container: C): MiddlewareFunction<T>;
}

export interface SwaggenRequest extends Request {
  locals?: { [key: string]: any };
  setHeaders?: { [key: string]: string };
  uuid?: string;
  executionStartTime: number;
}
