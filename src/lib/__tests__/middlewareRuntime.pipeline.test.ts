/**
 * Pipeline integration tests for `middlewareRuntime` (compile + run user code).
 *
 * `testMiddleware`: `Partial` input avoids duplicating every `MiddlewareConfig`
 * field in each case; spreading defaults after would trip TS2783 if the param type
 * required all keys (they’d always be overwritten by the spread).
 *
 * `req` init type: DOM `RequestInit` allows `signal: null`; Next’s `RequestInit`
 * does not — use the constructor’s second-arg type so tsc accepts test doubles.
 */
import {NextRequest, NextResponse} from 'next/server';

import {runPipeline} from '@/lib/middlewareRuntime';
import type {MiddlewareConfig} from '@/types/project';

const defaultMiddlewareFields: Pick<
    MiddlewareConfig,
    'description' | 'enabled' | 'isPreset' | 'order' | 'scope'
> = {
    description: '',
    enabled: true,
    isPreset: false,
    order: 0,
    scope: 'global',
};

function testMiddleware(
    partial: Partial<Omit<MiddlewareConfig, 'code'>> &
        Pick<MiddlewareConfig, 'id' | 'name' | 'code'>,
): MiddlewareConfig {
    return {...defaultMiddlewareFields, ...partial};
}

describe('runPipeline', () => {
    function req(
        url = 'http://localhost/api/demo/widgets',
        init?: ConstructorParameters<typeof NextRequest>[1],
    ) {
        return new NextRequest(url, init);
    }

    it('merges ctx.custom when middlewares run in order', async () => {
        const middlewares: MiddlewareConfig[] = [
            testMiddleware({
                id: 'a',
                name: 'first',
                order: 0,
                code: `
async function first(req, ctx) {
  return { ctx: { custom: { step: 1, fromFirst: true } } };
}
`,
            }),
            testMiddleware({
                id: 'b',
                name: 'second',
                order: 1,
                code: `
async function second(req, ctx) {
  return {
    ctx: {
      custom: {
        step: 2,
        sawFirst: ctx.custom.fromFirst === true,
      },
    },
  };
}
`,
            }),
        ];

        const {ctx, response, errors} = await runPipeline(req(), middlewares);

        expect(response).toBeUndefined();
        expect(errors).toHaveLength(0);
        expect(ctx.custom).toEqual({
            step: 2,
            fromFirst: true,
            sawFirst: true,
        });
    });

    it('applies top-level ctx fields (e.g. userId) for downstream middleware', async () => {
        const middlewares: MiddlewareConfig[] = [
            testMiddleware({
                id: 'auth',
                name: 'setUser',
                code: `
async function setUser(req, ctx) {
  return { ctx: { userId: 'user-42' } };
}
`,
            }),
            testMiddleware({
                id: 'use',
                name: 'readUser',
                code: `
async function readUser(req, ctx) {
  return { ctx: { custom: { echoedUserId: ctx.userId } } };
}
`,
            }),
        ];

        const {ctx, errors} = await runPipeline(req(), middlewares);

        expect(errors).toHaveLength(0);
        expect(ctx.userId).toBe('user-42');
        expect(ctx.custom).toEqual({echoedUserId: 'user-42'});
    });

    it('short-circuits with a response and still merges ctx from that result', async () => {
        const middlewares: MiddlewareConfig[] = [
            testMiddleware({
                id: 'gate',
                name: 'gate',
                code: `
async function gate(req, ctx) {
  return {
    ctx: { custom: { touched: true } },
    response: NextResponse.json({ ok: false }, { status: 401 }),
  };
}
`,
            }),
            testMiddleware({
                id: 'never',
                name: 'neverRuns',
                code: `
async function neverRuns(req, ctx) {
  return { ctx: { custom: { shouldNotAppear: true } } };
}
`,
            }),
        ];

        const {response, ctx, errors} = await runPipeline(req(), middlewares);

        expect(errors).toHaveLength(0);
        expect(ctx.custom.touched).toBe(true);
        expect(ctx.custom.shouldNotAppear).toBeUndefined();
        expect(response?.status).toBe(401);
        const body = await response!.json();
        expect(body).toEqual({ok: false});
    });

    it('records compilation errors and continues with remaining middleware', async () => {
        const middlewares: MiddlewareConfig[] = [
            testMiddleware({
                id: 'bad',
                name: 'broken',
                code: 'this is not valid middleware source',
            }),
            testMiddleware({
                id: 'good',
                name: 'recover',
                code: `
async function recover(req, ctx) {
  return { ctx: { custom: { recovered: true } } };
}
`,
            }),
        ];

        const {ctx, errors} = await runPipeline(req(), middlewares);

        expect(errors.some(e => e.includes('compilation failed'))).toBe(true);
        expect(ctx.custom).toEqual({recovered: true});
    });
});
