import {
  insertMethodStub,
  parseMethodsFromCode,
  reconcileMethods,
  removeMethodFromCode,
  renameMethodInCode,
  updateMethodSignature,
} from '@/lib/codeSyncUtils';
import type { ServiceMethod } from '@/types/project';

const SAMPLE_CLASS = `
class UserService {
  async list(): Promise<void> {
    return;
  }

  async healthCheck(): Promise<void> {
  }
}
`;

describe('parseMethodsFromCode', () => {
  it('extracts public async methods and skips healthCheck', () => {
    const methods = parseMethodsFromCode(SAMPLE_CLASS);
    expect(methods.map(m => m.name)).toEqual(['list']);
  });

  it('parses body param type as inputType', () => {
    const code = `
class X {
  async createUser(body: User, req: NextRequest): Promise<void> /* → User */ {
    return;
  }
}
`;
    const [m] = parseMethodsFromCode(code);
    expect(m?.name).toBe('createUser');
    expect(m?.inputType).toBe('User');
  });

  it('reads output type from trailing comment', () => {
    const code = `
class X {
  async get(): Promise<NextResponse> /* → User[] */ {
    return;
  }
}
`;
    const [m] = parseMethodsFromCode(code);
    expect(m?.outputType).toBe('User[]');
  });
});

describe('insertMethodStub', () => {
  it('inserts before healthCheck when present', () => {
    const next = insertMethodStub(SAMPLE_CLASS, 'ping', 'string', 'Promise<boolean>');
    expect(next).toMatch(/async ping\(/);
    expect(next.indexOf('async ping')).toBeLessThan(next.indexOf('async healthCheck'));
  });

  it('does not duplicate an existing method', () => {
    const once = insertMethodStub(SAMPLE_CLASS, 'list');
    expect((once.match(/async list\(/g) ?? []).length).toBe(1);
  });
});

describe('removeMethodFromCode', () => {
  it('removes a method by name', () => {
    const stripped = removeMethodFromCode(SAMPLE_CLASS, 'list');
    expect(stripped).not.toMatch(/async list\(/);
    expect(stripped).toMatch(/async healthCheck\(/);
  });

  it('is a no-op when method is missing', () => {
    expect(removeMethodFromCode(SAMPLE_CLASS, 'nope')).toBe(SAMPLE_CLASS);
  });
});

describe('renameMethodInCode', () => {
  it('renames async method declaration', () => {
    const out = renameMethodInCode(SAMPLE_CLASS, 'list', 'listAll');
    expect(out).toMatch(/async listAll\(/);
    expect(out).not.toMatch(/async list\(/);
  });

  it('returns same code when names equal', () => {
    expect(renameMethodInCode(SAMPLE_CLASS, 'list', 'list')).toBe(SAMPLE_CLASS);
  });
});

describe('updateMethodSignature', () => {
  it('replaces params and return while keeping body', () => {
    const code = `
class X {
  async foo(): Promise<void> {
    const x = 1;
    return;
  }
}
`;
    const out = updateMethodSignature(code, 'foo', 'PatchUser', 'Promise<User>');
    expect(out).toContain('async foo(body: PatchUser): Promise<User>');
    expect(out).toContain('const x = 1');
  });
});

describe('reconcileMethods', () => {
  it('keeps code order and syncs types from parsed methods', () => {
    const ui: ServiceMethod[] = [
      {
        name: 'a',
        description: 'keep me',
        inputType: 'old',
        outputType: 'old',
      },
    ];
    const parsed = [
      { name: 'a', params: '', returnType: 'Promise<void>', inputType: 'New', outputType: 'Out' },
    ];
    const merged = reconcileMethods(ui, parsed);
    expect(merged).toHaveLength(1);
    expect(merged[0].description).toBe('keep me');
    expect(merged[0].inputType).toBe('New');
    expect(merged[0].outputType).toBe('Out');
  });

  it('adds new methods from code with empty description', () => {
    const merged = reconcileMethods(
      [],
      [{ name: 'x', params: '', returnType: 'Promise<void>' }],
    );
    expect(merged[0]).toMatchObject({ name: 'x', description: '' });
  });
});
