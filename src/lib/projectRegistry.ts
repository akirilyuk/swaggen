/**
 * Server-side in-memory registry of project API paths.
 *
 * Stored on the Node.js `global` object so it survives Next.js
 * hot-module replacement (HMR). Without this, the module-level Map
 * is reset on every HMR cycle, causing "project not registered" errors.
 *
 * The client re-registers on every page mount via POST /api/_registry.
 */
import type {
  ApiPath,
  Entity,
  MiddlewareConfig,
  ServiceConfig,
  UIPage,
} from '@/types/project';

export interface RegisteredProject {
  /** URL-safe project slug (lowercased, spaces → hyphens) */
  slug: string;
  /** Human-readable project name */
  name: string;
  apiPaths: ApiPath[];
  middlewares: MiddlewareConfig[];
  services: ServiceConfig[];
  /** Frontend pages (for public /site/... routes) */
  pages: UIPage[];
  /** Entity definitions for runtime component rendering */
  entities: Entity[];
}

declare global {
  var __swaggenRegistry: Map<string, RegisteredProject> | undefined;
}

/** Singleton registry that outlives HMR cycles. */
const registry: Map<string, RegisteredProject> =
  globalThis.__swaggenRegistry ?? new Map();

globalThis.__swaggenRegistry = registry;

export function registerProject(project: RegisteredProject): void {
  registry.set(project.slug, {
    ...project,
    pages: project.pages ?? [],
    entities: project.entities ?? [],
  });
}

export function getProject(slug: string): RegisteredProject | undefined {
  return registry.get(slug);
}

export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
