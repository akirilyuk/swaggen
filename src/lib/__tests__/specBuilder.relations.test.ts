import { buildOpenApiSpec } from '@/lib/specBuilder';
import type { Entity, EntityRelation } from '@/types/project';

function entity(partial: Omit<Entity, 'middlewareBindings'> & { middlewareBindings?: Entity['middlewareBindings'] }): Entity {
  return {
    middlewareBindings: [],
    ...partial,
  };
}

describe('buildOpenApiSpec entity relations (schema linking)', () => {
  const userId = '11111111-1111-1111-1111-111111111111';
  const postId = '22222222-2222-2222-2222-222222222222';
  const commentId = '33333333-3333-3333-3333-333333333333';

  const user = entity({
    id: userId,
    name: 'User',
    description: 'Account',
    fields: [
      { name: 'email', type: 'string', required: true },
    ],
  });

  const post = entity({
    id: postId,
    name: 'Post',
    fields: [{ name: 'title', type: 'string', required: true }],
  });

  const comment = entity({
    id: commentId,
    name: 'Comment',
    fields: [{ name: 'body', type: 'string', required: true }],
  });

  it('adds a one-to-many relation as an array of $ref to the target schema', () => {
    const relations: EntityRelation[] = [
      {
        id: 'rel-1',
        sourceEntityId: userId,
        targetEntityId: postId,
        type: 'one-to-many',
        fieldName: 'posts',
        description: 'Posts by this user',
      },
    ];

    const spec = buildOpenApiSpec('Blog', [user, post], relations, [], []);

    const userSchema = spec.components as { schemas: Record<string, { properties?: Record<string, unknown> }> };
    const postsProp = userSchema.schemas.User.properties?.posts as {
      type: string;
      items: { $ref: string };
    };

    expect(postsProp.type).toBe('array');
    expect(postsProp.items.$ref).toBe('#/components/schemas/Post');
  });

  it('adds a many-to-one relation as a single $ref on the source entity', () => {
    const relations: EntityRelation[] = [
      {
        id: 'rel-2',
        sourceEntityId: postId,
        targetEntityId: userId,
        type: 'many-to-one',
        fieldName: 'author',
      },
    ];

    const spec = buildOpenApiSpec('Blog', [user, post], relations, [], []);
    const schemas = (spec.components as { schemas: Record<string, { properties?: Record<string, unknown> }> }).schemas;
    const author = schemas.Post.properties?.author as { $ref: string };

    expect(author.$ref).toBe('#/components/schemas/User');
  });

  it('uses array items for many-to-many outgoing relations', () => {
    const relations: EntityRelation[] = [
      {
        id: 'rel-3',
        sourceEntityId: postId,
        targetEntityId: commentId,
        type: 'many-to-many',
        fieldName: 'comments',
      },
    ];

    const spec = buildOpenApiSpec('Blog', [post, comment], relations, [], []);
    const schemas = (spec.components as { schemas: Record<string, unknown> }).schemas;
    const postSchema = schemas.Post as { properties?: Record<string, { type?: string }> };
    expect(postSchema.properties?.comments?.type).toBe('array');
  });

  it('does not attach relation properties when the target entity is missing from the project', () => {
    const relations: EntityRelation[] = [
      {
        id: 'rel-orphan',
        sourceEntityId: userId,
        targetEntityId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        type: 'one-to-many',
        fieldName: 'ghosts',
      },
    ];

    const spec = buildOpenApiSpec('Blog', [user], relations, [], []);
    const schemas = (spec.components as { schemas: Record<string, { properties?: Record<string, unknown> }> }).schemas;
    expect(schemas.User.properties?.ghosts).toBeUndefined();
  });
});
