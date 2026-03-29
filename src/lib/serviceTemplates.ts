/**
 * Built-in service templates.
 *
 * Services come in two shapes:
 *   1. **Class services** — extend BaseService, have methods + healthCheck()
 *   2. **Snippet services** — small utility functions with imports/deps
 *
 * Both shapes are valid. The code generator wraps snippet services in a
 * thin BaseService class so every service exposes healthCheck().
 */
import type { Entity, ServiceConfig, ServiceMethod } from '@/types/project';

export interface ServiceTemplate {
  id: string;
  name: string;
  description: string;
  requiresEntity: boolean;
  build: (serviceId: string, entity?: Entity) => ServiceConfig;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function instanceName(className: string): string {
  return className[0].toLowerCase() + className.slice(1);
}

function crudMethods(entity: Entity): ServiceMethod[] {
  const l = entity.name.toLowerCase();
  const p = `${l}s`;
  return [
    {
      name: `list${entity.name}s`,
      description: `List all ${p}`,
      outputType: `Promise<${entity.name}[]>`,
    },
    {
      name: `get${entity.name}`,
      description: `Get a ${l} by ID`,
      outputType: `Promise<${entity.name}>`,
    },
    {
      name: `create${entity.name}`,
      description: `Create a new ${l}`,
      inputType: entity.name,
      outputType: `Promise<${entity.name}>`,
    },
    {
      name: `update${entity.name}`,
      description: `Update a ${l}`,
      inputType: entity.name,
      outputType: `Promise<${entity.name}>`,
    },
    {
      name: `delete${entity.name}`,
      description: `Delete a ${l}`,
      outputType: 'Promise<void>',
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  Code builders                                                      */
/* ------------------------------------------------------------------ */

/** Build a full file string for a class-based service. */
function classService(
  className: string,
  stubs: {
    name: string;
    desc: string;
    inputType?: string;
    outputType?: string;
  }[],
  extraImports: string[] = [],
  healthBody = '    return this.healthy();',
): string {
  const imports = [
    "import { BaseService, type HealthCheckResult } from '../lib/baseService';",
    ...extraImports,
  ].join('\n');

  const inst = instanceName(className);

  const methods = stubs
    .map(s => {
      const params = s.inputType ? `body: ${s.inputType}` : '';
      const retType = s.outputType ?? 'Promise<void>';
      return `  async ${s.name}(${params}): ${retType} {
    // TODO: implement ${s.name}
  }`;
    })
    .join('\n\n');

  const body = methods ? `${methods}\n\n` : '';

  return `${imports}

export class ${className} extends BaseService {
  readonly serviceName = '${className}';

${body}  async healthCheck(): Promise<HealthCheckResult> {
${healthBody}
  }
}

export const ${inst} = new ${className}();
`;
}

/** Build a full file string for a snippet service (plain functions + health shim). */
function snippetService(
  name: string,
  importLines: string[],
  body: string,
): string {
  const inst = instanceName(name);
  const allImports = [
    "import { BaseService, type HealthCheckResult } from '../lib/baseService';",
    ...importLines,
  ].join('\n');

  return `${allImports}

${body.trim()}

export class ${name} extends BaseService {
  readonly serviceName = '${name}';
  async healthCheck(): Promise<HealthCheckResult> {
    return this.healthy();
  }
}

export const ${inst} = new ${name}();
`;
}

/* ------------------------------------------------------------------ */
/*  Default code for a new empty service                               */
/* ------------------------------------------------------------------ */

export const DEFAULT_SERVICE_CODE = `import { BaseService, type HealthCheckResult } from '../lib/baseService';

export class MyService extends BaseService {
  readonly serviceName = 'MyService';

  // Add your methods here

  async healthCheck(): Promise<HealthCheckResult> {
    return this.health(async () => this.ok({ ready: true }));
  }
}

export const myService = new MyService();
`;

/* ------------------------------------------------------------------ */
/*  Templates                                                          */
/* ------------------------------------------------------------------ */

export const SERVICE_TEMPLATES: ServiceTemplate[] = [
  /* ---- Class-based services ---- */
  {
    id: 'crud',
    name: 'CRUD Service',
    description:
      'Full CRUD class for an entity — list, get, create, update, delete.',
    requiresEntity: true,
    build: (id, entity) => {
      if (!entity) throw new Error('needs entity');
      const cn = `${entity.name}Service`;
      const methods = crudMethods(entity);
      return {
        id,
        name: cn,
        description: `CRUD service for ${entity.name}`,
        methods,
        code: classService(
          cn,
          methods.map(m => ({
            name: m.name,
            desc: m.description,
            inputType: m.inputType,
            outputType: m.outputType,
          })),
        ),
        dependencies: [],
        healthCheck: {
          enabled: true,
          path: `/health/${entity.name.toLowerCase()}`,
          code: '',
        },
      };
    },
  },
  {
    id: 'read-only',
    name: 'Read-Only Service',
    description: 'List + get only — no mutations.',
    requiresEntity: true,
    build: (id, entity) => {
      if (!entity) throw new Error('needs entity');
      const l = entity.name.toLowerCase();
      const cn = `${entity.name}ReadService`;
      const methods: ServiceMethod[] = [
        {
          name: `list${entity.name}s`,
          description: `List all ${l}s`,
          outputType: `Promise<${entity.name}[]>`,
        },
        {
          name: `get${entity.name}`,
          description: `Get ${l} by ID`,
          outputType: `Promise<${entity.name}>`,
        },
      ];
      return {
        id,
        name: cn,
        description: `Read-only service for ${entity.name}`,
        methods,
        code: classService(
          cn,
          methods.map(m => ({
            name: m.name,
            desc: m.description,
            outputType: m.outputType,
          })),
        ),
        dependencies: [],
        healthCheck: { enabled: true, path: `/health/${l}`, code: '' },
      };
    },
  },
  {
    id: 'auth',
    name: 'Auth Service',
    description: 'Login, register, refresh, logout, me — with JWT.',
    requiresEntity: false,
    build: id => {
      const cn = 'AuthService';
      const methods: ServiceMethod[] = [
        {
          name: 'login',
          description: 'Authenticate and return a token',
        },
        {
          name: 'register',
          description: 'Register a new user',
        },
        {
          name: 'refreshToken',
          description: 'Refresh an expired token',
        },
        {
          name: 'logout',
          description: 'Invalidate the session',
        },
        {
          name: 'me',
          description: 'Current user profile',
        },
      ];
      return {
        id,
        name: cn,
        description: 'Authentication service',
        methods,
        code: classService(
          cn,
          methods.map(m => ({
            name: m.name,
            desc: m.description,
          })),
          ["import jwt from 'jsonwebtoken';"],
          "    if (!process.env.JWT_SECRET) return this.unhealthy({ error: 'JWT_SECRET not set' });\n    return this.healthy();",
        ),
        dependencies: [{ name: 'jsonwebtoken', version: '^9.0.0' }],
        healthCheck: { enabled: true, path: '/health/auth', code: '' },
      };
    },
  },

  /* ---- Snippet services ---- */
  {
    id: 'email',
    name: 'Email Sender',
    description: 'Small utility that sends transactional emails via Resend.',
    requiresEntity: false,
    build: id => ({
      id,
      name: 'EmailService',
      description: 'Transactional email via Resend',
      methods: [],
      code: snippetService(
        'EmailService',
        ["import { Resend } from 'resend';"],
        `const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(to: string, subject: string, html: string) {
  return resend.emails.send({ from: 'noreply@example.com', to, subject, html });
}`,
      ),
      dependencies: [{ name: 'resend', version: '^4.0.0' }],
      healthCheck: { enabled: true, path: '/health/email', code: '' },
    }),
  },
  {
    id: 'storage',
    name: 'File Storage',
    description: 'Upload / download files using S3-compatible storage.',
    requiresEntity: false,
    build: id => ({
      id,
      name: 'StorageService',
      description: 'S3-compatible file storage',
      methods: [],
      code: snippetService(
        'StorageService',
        [
          "import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';",
        ],
        `const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'us-east-1' });
const BUCKET = process.env.S3_BUCKET ?? 'my-bucket';

export async function upload(key: string, body: Buffer, contentType: string) {
  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: contentType }));
  return { key };
}

export async function download(key: string) {
  const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  return res.Body;
}`,
      ),
      dependencies: [{ name: '@aws-sdk/client-s3', version: '^3.0.0' }],
      healthCheck: { enabled: true, path: '/health/storage', code: '' },
    }),
  },
  {
    id: 'cache',
    name: 'Cache Helper',
    description: 'Simple Redis-backed cache with get/set/del.',
    requiresEntity: false,
    build: id => ({
      id,
      name: 'CacheService',
      description: 'Redis cache helper',
      methods: [],
      code: snippetService(
        'CacheService',
        ["import { createClient } from 'redis';"],
        `const redis = createClient({ url: process.env.REDIS_URL });
redis.connect().catch(console.error);

export async function cacheGet(key: string): Promise<string | null> {
  return redis.get(key);
}

export async function cacheSet(key: string, value: string, ttlSeconds = 300) {
  await redis.set(key, value, { EX: ttlSeconds });
}

export async function cacheDel(key: string) {
  await redis.del(key);
}`,
      ),
      dependencies: [{ name: 'redis', version: '^4.0.0' }],
      healthCheck: { enabled: true, path: '/health/cache', code: '' },
    }),
  },
  {
    id: 'webhook',
    name: 'Webhook Dispatcher',
    description: 'Fire-and-forget HTTP webhooks with retry.',
    requiresEntity: false,
    build: id => ({
      id,
      name: 'WebhookService',
      description: 'HTTP webhook dispatcher with retry',
      methods: [],
      code: snippetService(
        'WebhookService',
        [],
        `export async function dispatch(url: string, payload: unknown, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) return { ok: true, status: res.status };
    } catch {
      if (i === retries - 1) throw new Error(\`Webhook to \${url} failed after \${retries} retries\`);
    }
    await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
  }
}`,
      ),
      dependencies: [],
      healthCheck: { enabled: true, path: '/health/webhook', code: '' },
    }),
  },

  /* ---- Blank ---- */
  {
    id: 'custom',
    name: 'Empty Service',
    description: 'Blank slate — write your own code.',
    requiresEntity: false,
    build: id => ({
      id,
      name: '',
      description: '',
      methods: [],
      code: DEFAULT_SERVICE_CODE,
      dependencies: [],
    }),
  },
];
