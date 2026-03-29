'use client';

import { Box, FolderOpen, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import PageShell from '@/components/PageShell';
import {
  Badge,
  Button,
  Card,
  ConfirmModal,
  EmptyState,
  Input,
  Textarea,
} from '@/components/ui';
import { useProjectStore } from '@/store/projectStore';

export default function DashboardPage() {
  const [hydrated, setHydrated] = useState(useProjectStore.persist.hasHydrated());
  const projects = useProjectStore(s => s.projects);
  const activeId = useProjectStore(s => s.activeProjectId);
  const addProject = useProjectStore(s => s.addProject);
  const deleteProject = useProjectStore(s => s.deleteProject);
  const setActive = useProjectStore(s => s.setActiveProject);

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = useProjectStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    setHydrated(useProjectStore.persist.hasHydrated());
    return unsubscribe;
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) return;
    await addProject(name.trim(), description.trim());
    setName('');
    setDescription('');
    setShowCreate(false);
  };

  return (
    <PageShell
      title="Dashboard"
      description="Manage your API projects"
      actions={
        <Button onClick={() => setShowCreate(true)}>
          <Plus size={16} />
          New Project
        </Button>
      }
    >
      {/* Create dialog */}
      {showCreate && (
        <Card className="max-w-lg">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
            Create Project
          </h2>
          <div className="flex flex-col gap-4">
            <Input
              label="Project Name"
              id="project-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="My API"
              autoFocus
            />
            <Textarea
              label="Description"
              id="project-desc"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="A short description of your project…"
              rows={2}
            />
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={!name.trim()}>
                Create
              </Button>
              <Button variant="secondary" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Project list */}
      {!hydrated && !showCreate ? (
        <Card className="max-w-lg">
          <div className="flex items-center gap-3 py-2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-500" />
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-white">
                Loading projects...
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Syncing data from Supabase
              </p>
            </div>
          </div>
        </Card>
      ) : projects.length === 0 && !showCreate ? (
        <EmptyState
          icon={<FolderOpen size={48} />}
          title="No projects yet"
          description="Create your first API project to get started."
          action={
            <Button onClick={() => setShowCreate(true)}>
              <Plus size={16} /> New Project
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map(project => (
            <Card
              key={project.id}
              className={`cursor-pointer transition-shadow hover:shadow-md ${
                project.id === activeId ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              <div
                onClick={() => {
                  setActive(project.id);
                  router.push('/entities');
                }}
                className="flex flex-col gap-3"
              >
                <div className="flex items-start justify-between">
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
                    {project.name}
                  </h3>
                  {project.id === activeId && (
                    <Badge variant="success">Active</Badge>
                  )}
                </div>
                {project.description && (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {project.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
                  <span className="flex items-center gap-1">
                    <Box size={12} /> {project.entities.length} entities
                  </span>
                  <span>· {project.middlewares.length} middlewares</span>
                  <span>· {project.services.length} services</span>
                </div>
                <p className="text-xs text-zinc-400">
                  Created {new Date(project.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="mt-3 flex gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={e => {
                    e.stopPropagation();
                    setActive(project.id);
                    router.push('/entities');
                  }}
                >
                  Open
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={e => {
                    e.stopPropagation();
                    setDeleteTarget({ id: project.id, name: project.name });
                  }}
                >
                  <Trash2 size={14} className="text-red-500" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <ConfirmModal
        open={!!deleteTarget}
        title="Delete project?"
        description={
          deleteTarget
            ? `Delete “${deleteTarget.name}”? This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmVariant="danger"
        onConfirm={() => {
          if (deleteTarget) deleteProject(deleteTarget.id);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </PageShell>
  );
}
