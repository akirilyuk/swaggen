import {
  getProject,
  registerProject,
  toSlug,
  type RegisteredProject,
} from '@/lib/projectRegistry';

function minimalProject(slug: string): RegisteredProject {
  return {
    slug,
    name: 'N',
    apiPaths: [],
    middlewares: [],
    services: [],
    pages: [],
    entities: [],
  };
}

describe('projectRegistry', () => {
  describe('toSlug', () => {
    it('lowercases and replaces non-alphanumeric runs with hyphens', () => {
      expect(toSlug('My Cool API')).toBe('my-cool-api');
    });

    it('trims leading and trailing hyphens', () => {
      expect(toSlug('  ---foo---  ')).toBe('foo');
    });

    it('handles empty-ish input', () => {
      expect(toSlug('')).toBe('');
      expect(toSlug('   ')).toBe('');
    });
  });

  describe('registerProject / getProject', () => {
    it('stores and retrieves a project by slug', () => {
      const slug = `__jest_reg_${Math.random().toString(36).slice(2)}__`;
      const p = minimalProject(slug);
      p.name = 'Demo';
      registerProject(p);
      const got = getProject(slug);
      expect(got?.name).toBe('Demo');
      expect(got?.pages).toEqual([]);
      expect(got?.entities).toEqual([]);
    });

    it('defaults missing pages and entities arrays', () => {
      const s = `__jest_reg_na_${Math.random().toString(36).slice(2)}__`;
      registerProject({
        slug: s,
        name: 'X',
        apiPaths: [],
        middlewares: [],
        services: [],
      } as unknown as RegisteredProject);
      const got = getProject(s);
      expect(got?.pages).toEqual([]);
      expect(got?.entities).toEqual([]);
    });
  });
});
