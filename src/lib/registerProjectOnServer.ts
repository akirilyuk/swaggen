import type { Project } from '@/types/project';

/** Push project to the in-memory server registry so `/site/...` and API routes resolve immediately. */
export async function registerProjectOnServer(project: Project): Promise<void> {
  await fetch('/registry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: project.name,
      apiPaths: project.apiPaths ?? [],
      middlewares: project.middlewares ?? [],
      services: project.services ?? [],
      pages: project.pages ?? [],
      entities: project.entities ?? [],
    }),
  });
}
