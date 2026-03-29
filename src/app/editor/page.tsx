'use client';

import Editor from '@monaco-editor/react';
import { Code, Download, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import PageShell from '@/components/PageShell';
import { Badge, Button, Card, EmptyState } from '@/components/ui';
import { buildOpenApiSpec } from '@/lib/specBuilder';
import { useProjectStore } from '@/store/projectStore';

export default function EditorPage() {
  const project = useProjectStore(s => s.activeProject());
  const updateSpec = useProjectStore(s => s.updateSpec);

  const [localSpec, setLocalSpec] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [stats, setStats] = useState({ paths: 0, schemas: 0 });

  // Sync from store on load / project change
  useEffect(() => {
    if (project) {
      setLocalSpec(project.openApiSpec);
    }
  }, [project?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live parse for stats and errors
  useEffect(() => {
    try {
      const parsed = JSON.parse(localSpec);
      setParseError(null);
      setStats({
        paths: Object.keys(parsed.paths ?? {}).length,
        schemas: Object.keys(parsed.components?.schemas ?? {}).length,
      });
    } catch (e) {
      setParseError((e as Error).message);
    }
  }, [localSpec]);

  const handleSave = useCallback(() => {
    if (parseError || !project) return;
    updateSpec(localSpec);

    const blob = new Blob([localSpec], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name
      .toLowerCase()
      .replace(/\s+/g, '-')}-openapi.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [localSpec, parseError, project, updateSpec]);

  /** Regenerate spec from entities / services / middlewares */
  const handleRegenerate = useCallback(() => {
    if (!project) return;
    const spec = buildOpenApiSpec(
      project.name,
      project.entities,
      project.relations,
      project.services,
      project.middlewares,
      project.apiPaths ?? [],
    );
    const json = JSON.stringify(spec, null, 2);
    setLocalSpec(json);
    updateSpec(json);
  }, [project, updateSpec]);

  if (!project) {
    return (
      <PageShell title="Spec Editor">
        <EmptyState
          icon={<Code size={48} />}
          title="No project selected"
          description="Select or create a project on the Dashboard first."
        />
      </PageShell>
    );
  }

  return (
    <PageShell
      title="OpenAPI Spec Editor"
      description="Edit the raw spec or regenerate it from your entities and services."
      actions={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleRegenerate}>
            <RefreshCw size={16} /> Regenerate from Entities
          </Button>
          <Button onClick={handleSave} disabled={!!parseError}>
            <Download size={16} /> Save Spec
          </Button>
        </div>
      }
    >
      {/* Status bar */}
      <div className="flex items-center gap-3">
        <Badge variant={parseError ? 'destructive' : 'success'}>
          {parseError ? 'Invalid JSON' : 'Valid'}
        </Badge>
        <span className="text-xs text-zinc-500">
          {stats.paths} paths · {stats.schemas} schemas
        </span>
        {parseError && (
          <span className="text-xs text-red-500">{parseError}</span>
        )}
      </div>

      {/* Editor */}
      <Card className="flex-1 overflow-hidden p-0">
        <Editor
          height="calc(100vh - 280px)"
          language="json"
          theme="vs-dark"
          value={localSpec}
          onChange={value => setLocalSpec(value ?? '')}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            formatOnPaste: true,
            tabSize: 2,
          }}
        />
      </Card>
    </PageShell>
  );
}
