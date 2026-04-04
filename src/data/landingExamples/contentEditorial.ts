import type { LandingExample } from './types';

export const contentEditorialExample: LandingExample = {
  id: 'content',
  title: 'Blog & editorial',
  tagline:
    'Posts, authors, tags, and comments — relational content APIs without manual YAML.',
  category: 'CMS',
  entities: [
    {
      name: 'Author',
      fields: [
        { name: 'displayName', type: 'string' },
        { name: 'bio', type: 'string' },
      ],
    },
    {
      name: 'Post',
      fields: [
        { name: 'slug', type: 'string' },
        { name: 'status', type: 'enum' },
        { name: 'publishedAt', type: 'date' },
      ],
    },
    {
      name: 'Tag',
      fields: [{ name: 'name', type: 'string' }],
    },
    {
      name: 'Comment',
      fields: [
        { name: 'body', type: 'string' },
        { name: 'moderationState', type: 'enum' },
      ],
    },
  ],
  relations: [
    { from: 'Author', label: '1 — N', to: 'Post' },
    { from: 'Post', label: 'N — M', to: 'Tag' },
    { from: 'Post', label: '1 — N', to: 'Comment' },
  ],
  operations: [
    {
      method: 'GET',
      path: '/posts/{slug}',
      summary: 'Public post + tags',
    },
    {
      method: 'POST',
      path: '/posts',
      summary: 'Create draft (author)',
    },
    {
      method: 'PATCH',
      path: '/comments/{id}',
      summary: 'Moderate comment',
    },
  ],
  snippetTitle: 'Next.js route handler (excerpt)',
  snippet: `export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params;
  const post = await getPostBySlug(slug);
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(post);
}`,
};
