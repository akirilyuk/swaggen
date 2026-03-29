'use client';

import Editor from '@monaco-editor/react';
import { Database } from 'lucide-react';

import PageShell from '@/components/PageShell';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Select,
} from '@/components/ui';
import { PROVIDER_LIST, STORAGE_PROVIDERS } from '@/lib/storageProviders';
import { useProjectStore } from '@/store/projectStore';
import type { DataStorageProvider } from '@/types/project';

export default function StoragePage() {
  const project = useProjectStore(s => s.activeProject());
  const updateDataStorage = useProjectStore(s => s.updateDataStorage);

  if (!project) {
    return (
      <PageShell title="Data Storage">
        <EmptyState
          icon={<Database size={48} />}
          title="No project selected"
          description="Select or create a project on the Dashboard first."
        />
      </PageShell>
    );
  }

  const config = project.dataStorage;
  const providerInfo = STORAGE_PROVIDERS[config.provider];

  const providerOptions = PROVIDER_LIST.map(p => ({
    value: p.value,
    label: p.label,
  }));

  return (
    <PageShell
      title="Data Storage"
      description={`Configure the data storage backend for "${project.name}"`}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Configuration */}
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
            Provider Settings
          </h2>
          <div className="flex flex-col gap-4">
            <Select
              label="Storage Provider"
              id="storage-provider"
              value={config.provider}
              onChange={e =>
                updateDataStorage({
                  ...config,
                  provider: e.target.value as DataStorageProvider,
                  connectionString:
                    STORAGE_PROVIDERS[e.target.value as DataStorageProvider]
                      .defaultConnectionString,
                })
              }
              options={providerOptions}
            />

            <Input
              label="Connection String"
              id="storage-conn"
              value={config.connectionString}
              onChange={e =>
                updateDataStorage({
                  ...config,
                  connectionString: e.target.value,
                })
              }
              placeholder={providerInfo.defaultConnectionString}
            />

            <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={e =>
                  updateDataStorage({ ...config, enabled: e.target.checked })
                }
                className="rounded"
              />
              Enable data storage integration
            </label>

            <div className="text-sm text-zinc-500 dark:text-zinc-400">
              <p>
                <strong>Package:</strong>{' '}
                <code className="text-blue-600">{providerInfo.npmPackage}</code>
              </p>
              <p>
                <strong>Env variable:</strong>{' '}
                <code className="text-blue-600">{providerInfo.envVarName}</code>
              </p>
            </div>

            <Badge variant={config.enabled ? 'success' : 'default'}>
              {config.enabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
        </Card>

        {/* Code preview */}
        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3 dark:border-zinc-700">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
              Sample Client Code
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                navigator.clipboard.writeText(providerInfo.sampleCode)
              }
            >
              Copy
            </Button>
          </div>
          <Editor
            height="320px"
            language="typescript"
            theme="vs-dark"
            value={providerInfo.sampleCode}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 13,
              scrollBeyondLastLine: false,
              lineNumbers: 'on',
            }}
          />
        </Card>
      </div>

      {/* All providers overview */}
      <h2 className="mt-8 text-lg font-semibold text-zinc-900 dark:text-white">
        Supported Providers
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PROVIDER_LIST.map(p => (
          <Card
            key={p.value}
            className={`cursor-pointer transition-shadow hover:shadow-md ${
              config.provider === p.value ? 'ring-2 ring-blue-500' : ''
            }`}
          >
            <div
              onClick={() =>
                updateDataStorage({
                  ...config,
                  provider: p.value,
                  connectionString: p.defaultConnectionString,
                })
              }
            >
              <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
                {p.label}
              </h3>
              <p className="mt-1 text-sm text-zinc-500">{p.description}</p>
              <p className="mt-2 text-xs text-zinc-400">
                <code>{p.npmPackage}</code>
              </p>
            </div>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
