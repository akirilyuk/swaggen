import {
  ApiError,
  ApiErrorInterface,
  DefaultContainer,
  makeAllKeysPrivateExceptSome as makeAllKeysOptionalExceptSome,
} from '../interfaces';

export type CreateErrorParams = makeAllKeysOptionalExceptSome<
  ApiErrorInterface,
  'message' | 'errorCode'
>;

export interface createError {
  ({
    originalError,
    message,
    data,
    errorCode,
    statusCode,
  }: CreateErrorParams): ApiError;
}

const errorCreatorFactory =
  (container: DefaultContainer) =>
  ({
    originalError,
    message,
    data,
    errorCode,
    statusCode,
  }: CreateErrorParams): ApiError => {
    const isApiError = originalError instanceof ApiError;
    const errorOpts: Omit<ApiErrorInterface, 'toExternalFormat'> = {
      errorId: isApiError ? originalError.errorId : container.uuidV4(),
      message,
      originalError,
      data: data || (originalError as ApiError)?.data,
      trace: isApiError ? [...originalError.trace, errorCode] : [errorCode],
      statusCode: isApiError
        ? originalError.statusCode
        : statusCode || container.STATUS.INTERNAL_SERVER_ERROR,
      errorCode: errorCode,
    };

    return new ApiError(errorOpts);
  };

export default errorCreatorFactory;
