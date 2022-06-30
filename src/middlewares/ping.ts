import { DefaultContainer } from '../interfaces';
import { MiddlewareFactory } from 'src/interfaces/middleware';

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
