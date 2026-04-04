import {
  concretePathForPublicSite,
  normalizePagePath,
  pathFromSegments,
  pathsMatch,
  routePatternMatches,
} from '@/lib/sitePagePath';

describe('normalizePagePath', () => {
  it('returns slash for empty input', () => {
    expect(normalizePagePath(undefined)).toBe('/');
    expect(normalizePagePath(null)).toBe('/');
    expect(normalizePagePath('')).toBe('/');
    expect(normalizePagePath('   ')).toBe('/');
  });

  it('ensures leading slash', () => {
    expect(normalizePagePath('about')).toBe('/about');
    expect(normalizePagePath('/about')).toBe('/about');
  });
});

describe('pathFromSegments', () => {
  it('maps segments to path', () => {
    expect(pathFromSegments(undefined)).toBe('/');
    expect(pathFromSegments([])).toBe('/');
    expect(pathFromSegments(['a', 'b'])).toBe('/a/b');
  });
});

describe('routePatternMatches', () => {
  it('matches dynamic segments to concrete values', () => {
    expect(routePatternMatches('/users/[id]', '/users/42')).toBe(true);
    expect(routePatternMatches('/users/[id]', '/users/42/extra')).toBe(false);
  });

  it('requires literal segments to match', () => {
    expect(routePatternMatches('/blog/post', '/blog/post')).toBe(true);
    expect(routePatternMatches('/blog/post', '/blog/page')).toBe(false);
  });
});

describe('pathsMatch', () => {
  it('matches identical normalized paths', () => {
    expect(pathsMatch('foo', '/foo')).toBe(true);
  });

  it('matches pattern to concrete when one side has dynamic segments', () => {
    expect(pathsMatch('/items/[id]', '/items/abc')).toBe(true);
    expect(pathsMatch('/items/abc', '/items/[id]')).toBe(true);
  });
});

describe('concretePathForPublicSite', () => {
  it('replaces dynamic segments with preview', () => {
    expect(concretePathForPublicSite('/posts/[slug]')).toBe('/posts/preview');
  });

  it('handles root', () => {
    expect(concretePathForPublicSite('/')).toBe('/');
  });
});
