'use client';

import { useRouter } from 'next/navigation';

import { useProjectStore } from '@/store/projectStore';
import { useAuthStore } from '@/store/authStore';
import { useProjectRegistry } from '@/lib/useProjectRegistry';
import { useActionLog } from '@/components/designer/ActionLogContext';

export default function Header() {
  const router = useRouter();
  const project = useProjectStore(s => s.activeProject());
  const projects = useProjectStore(s => s.projects);
  const setActive = useProjectStore(s => s.setActiveProject);

  const user = useAuthStore(s => s.user);
  const signOut = useAuthStore(s => s.signOut);
  const { log } = useActionLog();

  const handleSignOut = async () => {
    log('info', 'Sign out', 'from header');
    await signOut();
    router.push('/login');
  };

  // Sync the active project's API paths to the server-side registry
  useProjectRegistry();

  return (
    <header className="flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-6 dark:border-zinc-800 dark:bg-zinc-950">
      {/* Project selector */}
      <div className="flex items-center gap-3">
        <label
          htmlFor="project-select"
          className="text-sm font-medium text-zinc-500 dark:text-zinc-400"
        >
          Project:
        </label>
        <select
          id="project-select"
          value={project?.id ?? ''}
          onChange={e => {
            const id = e.target.value;
            const next = projects.find(p => p.id === id);
            setActive(id);
            if (next) log('info', 'Active project changed', next.name);
          }}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
        >
          {projects.length === 0 && (
            <option value="" disabled>
              Select a project
            </option>
          )}
          {projects.map(p => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Right section: project info + user */}
      <div className="flex items-center gap-4">
        {project && (
          <span className="text-xs text-zinc-400">
            Updated {new Date(project.updatedAt).toLocaleDateString()}
          </span>
        )}

        {user && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {user.email}
            </span>
            <a
              href="/profile"
              className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              Profile
            </a>
            <button
              onClick={handleSignOut}
              className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
