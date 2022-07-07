import { DefaultContainer, MiddlewareFactory } from '../interfaces';

export interface PongResult {
  message: 'pong';
}

const middleWareFn: MiddlewareFactory<DefaultContainer, PongResult> =
  ({ STATUS: { OK } }: DefaultContainer) =>
  () => {
    return {
      code: OK,
      data: {
        message: 'pong',
      },
    };
  };

export default middleWareFn;
