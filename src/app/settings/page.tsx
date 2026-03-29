'use client';

import { CheckCircle2, GitBranch, Settings } from 'lucide-react';
import { useCallback, useState } from 'react';

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

export default function SettingsPage() {
  const project = useProjectStore(s => s.activeProject());
  const updateProject = useProjectStore(s => s.updateProject);
  const updateGitRepo = useProjectStore(s => s.updateGitRepo);
  const deleteProject = useProjectStore(s => s.deleteProject);

  const [deleteProjectOpen, setDeleteProjectOpen] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  const gitRepo = project?.gitRepo ?? { url: '', branch: 'main', token: '', autoCommit: false };

  const handleGitChange = useCallback(
    (patch: Partial<typeof gitRepo>) => {
      updateGitRepo({ ...gitRepo, ...patch });
    },
    [gitRepo, updateGitRepo],
  );

  const handleTestConnection = useCallback(async () => {
    if (!gitRepo.url) return;
    setTestStatus('loading');
    setTestMessage('');

    try {
      const repoUrl = gitRepo.url.replace(/\.git$/, '');
      let apiUrl: string;

      if (repoUrl.includes('github.com')) {
        const match = repoUrl.match(/github\.com[/:](.+?)\/(.+?)(?:$|\/)/);
        if (!match) throw new Error('Could not parse GitHub URL');
        apiUrl = `https://api.github.com/repos/${match[1]}/${match[2]}`;
      } else if (repoUrl.includes('gitlab.com')) {
        const match = repoUrl.match(/gitlab\.com[/:](.+?)\/(.+?)(?:$|\/)/);
        if (!match) throw new Error('Could not parse GitLab URL');
        apiUrl = `https://gitlab.com/api/v4/projects/${encodeURIComponent(`${match[1]}/${match[2]}`)}`;
      } else {
        throw new Error('Only GitHub and GitLab URLs are supported for connection testing');
      }

      const headers: Record<string, string> = { Accept: 'application/json' };
      if (gitRepo.token) {
        headers.Authorization = repoUrl.includes('gitlab.com')
          ? `Bearer ${gitRepo.token}`
          : `token ${gitRepo.token}`;
      }

      const res = await fetch(apiUrl, { headers });
      if (!res.ok) {
        const status = res.status;
        if (status === 404) throw new Error('Repository not found — check the URL or token permissions');
        if (status === 401 || status === 403) throw new Error('Authentication failed — check your access token');
        throw new Error(`Request failed with status ${status}`);
      }

      setTestStatus('success');
      setTestMessage('Connected successfully');
    } catch (e) {
      setTestStatus('error');
      setTestMessage((e as Error).message);
    }
  }, [gitRepo]);

  if (!project) {
    return (
      <PageShell title="Settings">
        <EmptyState
          icon={<Settings size={48} />}
          title="No project selected"
          description="Select or create a project on the Dashboard first."
        />
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Project Settings"
      description={`Manage "${project.name}"`}
    >
      {/* General */}
      <Card className="max-w-lg">
        <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-white">
          General
        </h2>
        <div className="flex flex-col gap-4">
          <Input
            label="Project Name"
            id="settings-name"
            value={project.name}
            onChange={e => updateProject(project.id, { name: e.target.value })}
          />
          <Textarea
            label="Description"
            id="settings-desc"
            value={project.description}
            onChange={e =>
              updateProject(project.id, { description: e.target.value })
            }
            rows={3}
          />
          <div className="text-xs text-zinc-400">
            <p>Created: {new Date(project.createdAt).toLocaleString()}</p>
            <p>Updated: {new Date(project.updatedAt).toLocaleString()}</p>
            <p>ID: {project.id}</p>
          </div>
        </div>
      </Card>

      {/* Git Repository */}
      <Card className="max-w-lg">
        <div className="mb-4 flex items-center gap-2">
          <GitBranch size={16} className="text-zinc-500" />
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
            Git Repository
          </h2>
          {gitRepo.url && (
            <Badge variant={testStatus === 'success' ? 'success' : 'default'}>
              {gitRepo.url ? 'Connected' : 'Not connected'}
            </Badge>
          )}
        </div>
        <div className="flex flex-col gap-4">
          <Input
            label="Repository URL"
            id="git-url"
            value={gitRepo.url}
            onChange={e => handleGitChange({ url: e.target.value })}
            placeholder="https://github.com/user/repo.git"
          />
          <Input
            label="Branch"
            id="git-branch"
            value={gitRepo.branch}
            onChange={e => handleGitChange({ branch: e.target.value })}
            placeholder="main"
          />
          <Input
            label="Personal Access Token"
            id="git-token"
            type="password"
            value={gitRepo.token}
            onChange={e => handleGitChange({ token: e.target.value })}
            placeholder="ghp_… or glpat-…"
          />
          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={gitRepo.autoCommit}
              onChange={e => handleGitChange({ autoCommit: e.target.checked })}
              className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 dark:border-zinc-600"
            />
            Auto-commit on generate
          </label>

          {/* Test connection */}
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleTestConnection}
              disabled={!gitRepo.url || testStatus === 'loading'}
            >
              {testStatus === 'loading' ? 'Testing…' : 'Test Connection'}
            </Button>
            {testStatus === 'success' && (
              <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                <CheckCircle2 size={14} /> {testMessage}
              </span>
            )}
            {testStatus === 'error' && (
              <span className="text-xs text-red-500">{testMessage}</span>
            )}
          </div>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card className="max-w-lg">
        <h2 className="mb-4 text-sm font-semibold text-red-600 dark:text-red-400">
          Danger Zone
        </h2>
        <Button
          variant="danger"
          onClick={() => setDeleteProjectOpen(true)}
        >
          Delete Project
        </Button>
      </Card>
      <ConfirmModal
        open={deleteProjectOpen}
        title="Delete project?"
        description={`Are you sure you want to delete “${project.name}”? This cannot be undone.`}
        confirmLabel="Delete project"
        cancelLabel="Cancel"
        confirmVariant="danger"
        onConfirm={() => {
          deleteProject(project.id);
          setDeleteProjectOpen(false);
        }}
        onCancel={() => setDeleteProjectOpen(false)}
      />
    </PageShell>
  );
}
