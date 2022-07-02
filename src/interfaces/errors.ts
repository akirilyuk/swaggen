export interface ApiErrorInterface {
  message: string;
  errorCode: string;
  statusCode: number;
  trace: string[];
  originalError?: Error | unknown;
  data: any;
  errorId: string;
  toExternalFormat(): ApiErrorExternal;
}
export interface ApiErrorExternal {
  name: string;
  errorId: string;
  data?: any;
  trace: string[];
  code: number;
}

export class ApiError extends Error implements ApiErrorInterface {
  errorCode: string;
  statusCode: number;
  trace: string[];
  originalError?: unknown;
  data: any;
  errorId: string;
  originalStack: string | undefined;
  constructor(opts: Omit<ApiErrorInterface, 'toExternalFormat'>) {
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
    this.errorCode = errorCode;

    this.statusCode = statusCode;
    this.data = data;
    this.originalStack = (originalError as Error)?.stack;
    this.trace = trace;
    this.originalError = originalError;
    this.errorId = errorId;
  }

  toExternalFormat(): ApiErrorExternal {
    return {
      name: this.trace[0],
      errorId: this.errorId,
      data: this.data,
      trace: this.trace,
      code: this.statusCode,
    };
  }
}
