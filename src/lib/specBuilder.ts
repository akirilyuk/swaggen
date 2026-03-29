/**
 * Builds a complete OpenAPI 3.0 spec from project entities, relations, services and middlewares.
 * Pure function — no side effects.
 */
import type {
  ApiPath,
  Entity,
  EntityRelation,
  HttpMethod,
  MiddlewareConfig,
  ServiceConfig,
} from '@/types/project';

/* ------------------------------------------------------------------ */
/*  Field type → OpenAPI schema mapping                                */
/* ------------------------------------------------------------------ */

/** Strip the Promise<> wrapper from a type string, e.g. "Promise<User[]>" → "User[]". */
function unwrapPromise(type?: string): string | undefined {
  if (!type) return undefined;
  const match = type.match(/^Promise\s*<([\s\S]+)>$/);
  if (match) {
    const inner = match[1].trim();
    return inner === 'void' ? undefined : inner;
  }
  return type === 'void' ? undefined : type;
}

/** Infer the HTTP method from a service method name. */
function inferHttpMethod(name: string): HttpMethod {
  const lower = name.toLowerCase();
  if (
    lower.startsWith('create') ||
    lower.startsWith('register') ||
    lower.startsWith('login') ||
    lower.startsWith('logout') ||
    lower.startsWith('refresh')
  )
    return 'POST';
  if (lower.startsWith('update')) return 'PUT';
  if (lower.startsWith('delete') || lower.startsWith('remove')) return 'DELETE';
  return 'GET';
}

const FIELD_TYPE_MAP: Record<string, Record<string, string>> = {
  string: { type: 'string' },
  number: { type: 'number' },
  boolean: { type: 'boolean' },
  date: { type: 'string', format: 'date-time' },
  uuid: { type: 'string', format: 'uuid' },
  json: { type: 'object' },
  enum: { type: 'string' },
};

/* ------------------------------------------------------------------ */
/*  Schema builders                                                    */
/* ------------------------------------------------------------------ */

function buildFieldSchema(field: Entity['fields'][number]) {
  const base: Record<string, unknown> = {
    ...FIELD_TYPE_MAP[field.type],
  };
  if (field.description) base.description = field.description;
  if (field.type === 'enum' && field.enumValues?.length) {
    base.enum = field.enumValues;
  }
  if (field.defaultValue !== undefined && field.defaultValue !== '') {
    base.default = field.defaultValue;
  }
  return base;
}

function buildEntitySchema(
  entity: Entity,
  relations: EntityRelation[],
  entities: Entity[],
) {
  const properties: Record<string, unknown> = {
    id: { type: 'string', format: 'uuid', description: 'Primary key' },
  };
  const required: string[] = ['id'];

  for (const field of entity.fields) {
    properties[field.name] = buildFieldSchema(field);
    if (field.required) required.push(field.name);
  }

  // Add relation references
  for (const rel of relations.filter(r => r.sourceEntityId === entity.id)) {
    const target = entities.find(e => e.id === rel.targetEntityId);
    if (!target) continue;

    const isArray = rel.type === 'one-to-many' || rel.type === 'many-to-many';
    properties[rel.fieldName] = isArray
      ? {
          type: 'array',
          items: { $ref: `#/components/schemas/${target.name}` },
        }
      : { $ref: `#/components/schemas/${target.name}` };
  }

  return {
    type: 'object' as const,
    required,
    properties,
    ...(entity.description ? { description: entity.description } : {}),
  };
}

/* ------------------------------------------------------------------ */
/*  Path builders                                                      */
/* ------------------------------------------------------------------ */

function buildEntityPaths(
  entity: Entity,
  entities: Entity[],
  services: ServiceConfig[],
  middlewares: MiddlewareConfig[],
) {
  const paths: Record<string, Record<string, unknown>> = {};
  const basePath = `/${entity.name.toLowerCase()}s`;
  const itemPath = `${basePath}/{id}`;

  // Resolve global middlewares (always run on every method)
  const globalMiddlewares = middlewares
    .filter(m => m.enabled && m.scope === 'global')
    .sort((a, b) => a.order - b.order);

  // Build a lookup: for each HTTP method, which route-scoped middleware names apply?
  const bindings = entity.middlewareBindings ?? [];
  const resolveForMethod = (method: HttpMethod): string[] => {
    const globalNames = globalMiddlewares.map(m => m.name);
    const routeNames = bindings
      .filter(b => b.methods.includes(method))
      .map(b => middlewares.find(m => m.id === b.middlewareId))
      .filter(
        (m): m is MiddlewareConfig => !!m && m.enabled && m.scope === 'route',
      )
      .sort((a, b) => a.order - b.order)
      .map(m => m.name);
    return [...globalNames, ...routeNames];
  };

  /** Attach x-middlewares to an operation if any middlewares apply. */
  const withMw = (method: HttpMethod) => {
    const names = resolveForMethod(method);
    return names.length > 0 ? { 'x-middlewares': names } : {};
  };

  /** Set of all entity names for schema $ref resolution. */
  const entityNames = new Set(entities.map(e => e.name));

  /** Check if a method references this entity via its type strings or legacy entityId. */
  const methodRefsEntity = (
    m: ServiceConfig['methods'][number],
    eName: string,
  ) =>
    m.entityId === entity.id ||
    typeRefsEntity(m.inputType, eName) ||
    typeRefsEntity(m.outputType, eName);

  /** Check if a type string references an entity name (handles Promise<> wrapper). */
  const typeRefsEntity = (type: string | undefined, eName: string) => {
    const unwrapped = unwrapPromise(type);
    return !!unwrapped && (unwrapped === eName || unwrapped === `${eName}[]`);
  };

  // Check if a service explicitly covers this entity
  const entityServices = services.filter(s =>
    s.methods.some(m => methodRefsEntity(m, entity.name)),
  );

  if (entityServices.length > 0) {
    // Build paths from explicit service functions
    for (const svc of entityServices) {
      for (const method of svc.methods.filter(m =>
        methodRefsEntity(m, entity.name),
      )) {
        const verb = inferHttpMethod(method.name);
        const needsId =
          ['PUT', 'DELETE'].includes(verb) ||
          method.name.toLowerCase().startsWith('get');
        const pathKey = needsId ? itemPath : basePath;
        if (!paths[pathKey]) paths[pathKey] = {};

        const inputName =
          method.inputType ??
          (verb !== 'GET' && verb !== 'DELETE' ? entity.name : undefined);
        const outputName = unwrapPromise(method.outputType) ?? entity.name;

        paths[pathKey][verb.toLowerCase()] = {
          operationId: method.name,
          summary: method.description,
          tags: [entity.name],
          ...withMw(verb),
          ...buildOperationBody(inputName, outputName, entityNames),
          ...(needsId
            ? {
                parameters: [
                  {
                    name: 'id',
                    in: 'path',
                    required: true,
                    schema: { type: 'string', format: 'uuid' },
                  },
                ],
              }
            : {}),
        };
      }
    }
  } else {
    // Generate default CRUD paths
    paths[basePath] = {
      get: {
        operationId: `list${entity.name}s`,
        summary: `List all ${entity.name}s`,
        tags: [entity.name],
        ...withMw('GET'),
        responses: {
          200: {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: `#/components/schemas/${entity.name}` },
                },
              },
            },
          },
        },
      },
      post: {
        operationId: `create${entity.name}`,
        summary: `Create a ${entity.name}`,
        tags: [entity.name],
        'x-validate': true,
        ...withMw('POST'),
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: `#/components/schemas/${entity.name}` },
            },
          },
        },
        responses: {
          201: {
            description: 'Created',
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/${entity.name}` },
              },
            },
          },
        },
      },
    };

    paths[itemPath] = {
      get: {
        operationId: `get${entity.name}`,
        summary: `Get a ${entity.name} by ID`,
        tags: [entity.name],
        ...withMw('GET'),
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/${entity.name}` },
              },
            },
          },
        },
      },
      put: {
        operationId: `update${entity.name}`,
        summary: `Update a ${entity.name}`,
        tags: [entity.name],
        'x-validate': true,
        ...withMw('PUT'),
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: `#/components/schemas/${entity.name}` },
            },
          },
        },
        responses: {
          200: {
            description: 'Updated',
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/${entity.name}` },
              },
            },
          },
        },
      },
      delete: {
        operationId: `delete${entity.name}`,
        summary: `Delete a ${entity.name}`,
        tags: [entity.name],
        ...withMw('DELETE'),
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: { 204: { description: 'Deleted' } },
      },
    };
  }

  return paths;
}

/**
 * Build the request/response body for an OpenAPI operation.
 * Uses $ref for types matching known entity names, inline schema otherwise.
 */
function buildOperationBody(
  inputType?: string,
  outputType?: string,
  knownEntities?: Set<string>,
) {
  const toSchema = (type: string | undefined) => {
    if (!type || type === 'void') return undefined;
    // Handle array types like "User[]"
    const arrayMatch = type.match(/^(.+)\[\]$/);
    if (arrayMatch) {
      const inner = arrayMatch[1];
      const itemSchema = knownEntities?.has(inner)
        ? { $ref: `#/components/schemas/${inner}` }
        : { type: 'object' as const, description: inner };
      return { type: 'array' as const, items: itemSchema };
    }
    // Known entity → $ref
    if (knownEntities?.has(type)) {
      return { $ref: `#/components/schemas/${type}` };
    }
    // Primitive or unknown → inline
    return { type: 'object' as const, description: type };
  };

  const inputSchema = toSchema(inputType);
  const outputSchema = toSchema(outputType);

  return {
    ...(inputSchema && {
      'x-validate': true,
      requestBody: {
        required: true,
        content: { 'application/json': { schema: inputSchema } },
      },
    }),
    responses: {
      200: {
        description: 'Successful response',
        content: {
          'application/json': {
            schema: outputSchema ?? { type: 'object' },
          },
        },
      },
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export function buildOpenApiSpec(
  projectName: string,
  entities: Entity[],
  relations: EntityRelation[],
  services: ServiceConfig[],
  middlewares: MiddlewareConfig[],
  apiPaths: ApiPath[] = [],
): Record<string, unknown> {
  const schemas: Record<string, unknown> = {};
  const paths: Record<string, unknown> = {};

  // Generate schemas for every entity — no auto-CRUD paths
  for (const entity of entities) {
    schemas[entity.name] = buildEntitySchema(entity, relations, entities);
  }

  const entityNames = new Set(entities.map(e => e.name));

  // Fold manually defined API paths into the spec
  for (const ap of apiPaths) {
    if (!ap.path) continue;
    if (!paths[ap.path]) paths[ap.path] = {};

    for (const op of ap.operations) {
      const verb = op.method.toLowerCase();
      const mwNames = op.middlewareIds
        .map(id => middlewares.find(m => m.id === id)?.name)
        .filter((n): n is string => !!n);

      paths[ap.path] = {
        ...(paths[ap.path] as Record<string, unknown>),
        [verb]: {
          operationId: `${verb}_${ap.path.replace(/[^a-zA-Z0-9]/g, '_')}`,
          summary: op.summary || `${op.method} ${ap.path}`,
          ...(op.description ? { description: op.description } : {}),
          tags:
            op.tags.length > 0 ? op.tags : [ap.path.split('/')[1] || 'default'],
          ...(mwNames.length > 0 ? { 'x-middlewares': mwNames } : {}),
          ...buildOperationBody(op.inputType, op.outputType, entityNames),
        },
      };
    }
  }

  // Service-derived paths (kept for health checks and explicit service methods)
  const globalMiddlewares = middlewares
    .filter(m => m.enabled && m.scope === 'global')
    .sort((a, b) => a.order - b.order);

  for (const svc of services) {
    for (const method of svc.methods) {
      // Only add service methods that reference a known entity
      const inputName = unwrapPromise(method.inputType);
      const outputName = unwrapPromise(method.outputType);
      const refsEntity =
        (inputName && entityNames.has(inputName)) ||
        (inputName && entityNames.has(inputName.replace('[]', ''))) ||
        (outputName && entityNames.has(outputName)) ||
        (outputName && entityNames.has(outputName.replace('[]', '')));
      if (!refsEntity) continue;

      const verb = inferHttpMethod(method.name);
      const baseName = (outputName ?? inputName ?? 'resource')
        .replace('[]', '')
        .toLowerCase();
      const needsId =
        ['PUT', 'DELETE'].includes(verb) ||
        method.name.toLowerCase().startsWith('get');
      const pathKey = needsId ? `/${baseName}s/{id}` : `/${baseName}s`;

      if (!paths[pathKey]) paths[pathKey] = {};
      const globalNames = globalMiddlewares.map(m => m.name);

      (paths[pathKey] as Record<string, unknown>)[verb.toLowerCase()] = {
        operationId: method.name,
        summary: method.description || `${verb} ${pathKey}`,
        tags: [baseName],
        ...(globalNames.length > 0 ? { 'x-middlewares': globalNames } : {}),
        ...buildOperationBody(inputName, outputName, entityNames),
        ...(needsId
          ? {
              parameters: [
                {
                  name: 'id',
                  in: 'path',
                  required: true,
                  schema: { type: 'string', format: 'uuid' },
                },
              ],
            }
          : {}),
      };
    }
  }

  // Add individual service health check endpoints
  const healthServices = services.filter(s => s.healthCheck?.enabled);
  for (const svc of healthServices) {
    const hcPath = svc.healthCheck!.path || `/health/${svc.name.toLowerCase()}`;
    paths[hcPath] = {
      get: {
        operationId: `healthCheck_${svc.name}`,
        summary: `Health check for ${svc.name}`,
        tags: ['Health'],
        responses: {
          200: {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthCheckResult' },
              },
            },
          },
          503: { description: 'Service is unhealthy' },
        },
      },
    };
  }

  // Add aggregated /health endpoint if any service has a health check
  if (healthServices.length > 0) {
    // Avoid overwriting if a HealthService already defined /health
    if (!paths['/health']) {
      paths['/health'] = {
        get: {
          operationId: 'healthCheckAll',
          summary: 'Aggregated health check for all services',
          tags: ['Health'],
          responses: {
            200: {
              description: 'All services healthy',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/AggregatedHealthCheck',
                  },
                },
              },
            },
            503: { description: 'One or more services unhealthy' },
          },
        },
      };
    }

    // Health schemas
    schemas['HealthCheckResult'] = {
      type: 'object',
      required: ['service', 'healthy'],
      properties: {
        service: { type: 'string' },
        healthy: { type: 'boolean' },
        details: { type: 'object' },
      },
    };
    schemas['AggregatedHealthCheck'] = {
      type: 'object',
      required: ['healthy', 'services'],
      properties: {
        healthy: { type: 'boolean' },
        services: {
          type: 'array',
          items: { $ref: '#/components/schemas/HealthCheckResult' },
        },
      },
    };
  }

  return {
    openapi: '3.0.0',
    info: {
      title: projectName,
      version: '1.0.0',
      description: `Auto-generated OpenAPI spec for ${projectName}`,
    },
    paths,
    components: { schemas },
  };
}
