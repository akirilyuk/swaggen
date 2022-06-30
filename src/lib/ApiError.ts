import { DefaultContainer } from '../interfaces';

export interface ApiErrorOptions {
  message: string;
  errorCode: string;
  statusCode: number;
  trace: string[];
  originalError?: Error | unknown;
  data?: any;
  errorId: string;
}

export interface CreateErrorParams {
  message: string;
  errorCode: string;
  statusCode?: number;
  originalError?: Error | unknown;
  data?: any;
}

export interface ApiError {
  trace: string[];
  errorId: string;
  data: any;
  originalError?: Error | unknown;
  code: number;
}

export class ApiError extends Error implements ApiError {
  trace: string[];
  errorId: string;
  data: any;
  originalError?: Error | unknown;
  code: number;
  constructor(opts: ApiErrorOptions) {
    const {
      originalError,
      message,
      data,
      errorCode,
      statusCode,
      trace,
      errorId,
    } = opts;
    super(message);
    this.name = errorCode;

    this.code = statusCode;
    this.data = data;
    this.stack = (originalError as Error)?.stack;
    this.trace = trace;
    this.originalError = originalError;
    this.errorId = errorId;
  }

  toJSON() {
    return {
      name: this.name,
      errorId: this.errorId,
      data: this.data,
      trace: this.trace,
      code: this.code,
    };
  }
}

export interface createError {
  (opts: CreateErrorParams): ApiError;
}

const errorCreatorFactory =
  (container: DefaultContainer) =>
  (opts: CreateErrorParams): ApiError => {
    const { originalError, message, data, errorCode, statusCode } = opts;

    const errorOpts: ApiErrorOptions = {
      errorId:
        originalError instanceof ApiError
          ? originalError.errorId
          : container.uuidV4(),
      message,
      originalError,
      data: data || (originalError as ApiError)?.data,
      trace:
        originalError instanceof ApiError
          ? [errorCode, ...originalError.trace]
          : [errorCode],
      statusCode:
        originalError instanceof ApiError
          ? originalError.code
          : statusCode || container.STATUS.INTERNAL_SERVER_ERROR,
      errorCode,
    };

    return new ApiError(errorOpts);
  };

export default errorCreatorFactory;
