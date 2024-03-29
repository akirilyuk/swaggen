import { DefaultContainer } from 'src';
import { MiddlewareFactory } from 'src/middlewares/middleware';

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
