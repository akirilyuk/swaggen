import { Request } from 'express';
export interface MiddlewareResult<T> {
  code?: number;
  data?: T;
}

export interface MiddlewareFunction<T> {
  (req: SwaggenRequest): MiddlewareResult<T>;
}

export interface MiddlewareFactory<C, T> {
  (container: C): MiddlewareFunction<T>;
}

export interface SwaggenRequest extends Request {
  locals?: { [key: string]: any };
  setHeaders?: { [key: string]: string };
  uuid?: string;
  executionStartTime: number;
}
