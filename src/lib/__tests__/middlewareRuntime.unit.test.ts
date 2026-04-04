import { mergeCtx, stripTypeScript, type PipelineContext } from '@/lib/middlewareRuntime';

describe('stripTypeScript', () => {
  it('removes export and parameter type annotations from async function', () => {
    const src = `
export async function handler(req: NextRequest, ctx: Ctx): Promise<{ ctx: { userId: string } }> {
  return { ctx: { userId: '1' } };
}
`;
    const out = stripTypeScript(src);
    expect(out).toContain('async function handler(req, ctx)');
    expect(out).not.toContain('NextRequest');
    expect(out).not.toMatch(/^\s*export\s+/m);
  });

  it('strips standalone import lines', () => {
    const src = `import { x } from 'y';
async function a(): Promise<void> {}
`;
    expect(stripTypeScript(src)).not.toMatch(/^import /m);
  });
});

describe('mergeCtx', () => {
  it('merges top-level keys and shallow-merges custom', () => {
    const ctx: PipelineContext = {
      requestId: 'r1',
      requestStart: 0,
      custom: { a: 1 },
    };
    mergeCtx(ctx, {
      userId: 'u',
      custom: { b: 2 },
    });
    expect(ctx.userId).toBe('u');
    expect(ctx.custom).toEqual({ a: 1, b: 2 });
  });
});
