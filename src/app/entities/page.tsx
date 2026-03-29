'use client';

import {
  Box,
  ChevronDown,
  ChevronRight,
  Plus,
  Save,
  Shuffle,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { v4 as uuidV4 } from 'uuid';

import PageShell from '@/components/PageShell';
import {
  Badge,
  Button,
  Card,
  ConfirmModal,
  EmptyState,
  Input,
  Select,
  Textarea,
} from '@/components/ui';
import { useProjectStore, ENTITY_TEMPLATE_PACKS } from '@/store/projectStore';
import type { Entity, EntityField } from '@/types/project';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const FIELD_TYPES = [
  { value: 'string', label: 'String' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'date', label: 'Date' },
  { value: 'enum', label: 'Enum' },
  { value: 'json', label: 'JSON' },
  { value: 'uuid', label: 'UUID' },
];

const emptyField = (): EntityField => ({
  name: '',
  type: 'string',
  required: false,
  description: '',
});

/** Stable compare for “dirty” detection (saved entity vs draft). */
function entityContentFingerprint(e: Entity): string {
  return JSON.stringify({
    name: e.name.trim(),
    description: (e.description ?? '').trim(),
    fields: e.fields.map(f => ({
      name: f.name.trim(),
      type: f.type,
      required: f.required,
      description: (f.description ?? '').trim(),
      enumValues: f.enumValues ?? [],
      defaultValue: f.defaultValue ?? '',
    })),
    middlewareBindings: (e.middlewareBindings ?? [])
      .map(b => ({
        middlewareId: b.middlewareId,
        methods: [...b.methods].sort(),
      }))
      .sort((a, b) => a.middlewareId.localeCompare(b.middlewareId)),
  });
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function EntitiesPage() {
  const project = useProjectStore(s => s.activeProject());
  const addEntity = useProjectStore(s => s.addEntity);
  const updateEntity = useProjectStore(s => s.updateEntity);
  const deleteEntity = useProjectStore(s => s.deleteEntity);
  const deleteAllEntities = useProjectStore(s => s.deleteAllEntities);
  const addEntityTemplate = useProjectStore(s => s.addEntityTemplate);

  const [editing, setEditing] = useState<Entity | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [entityDeleteTarget, setEntityDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);

  const canSaveEntity = useMemo(() => {
    if (!project || !editing || !editing.name.trim()) return false;
    if (isNew) return true;
    const baseline = project.entities.find(en => en.id === editing.id);
    if (!baseline) return true;
    return entityContentFingerprint(editing) !== entityContentFingerprint(baseline);
  }, [editing, isNew, project]);

  if (!project) {
    return (
      <PageShell title="Entities">
        <EmptyState
          icon={<Box size={48} />}
          title="No project selected"
          description="Select or create a project on the Dashboard first."
        />
      </PageShell>
    );
  }

  const startCreate = () => {
    setEditing({
      id: uuidV4(),
      name: '',
      description: '',
      fields: [emptyField()],
      middlewareBindings: [],
    });
    setIsNew(true);
  };

  const startEdit = (entity: Entity) => {
    setEditing({
      ...entity,
      fields: entity.fields.map(f => ({ ...f })),
    });
    setIsNew(false);
  };

  const save = () => {
    if (!editing || !editing.name.trim()) return;
    const cleaned: Entity = {
      ...editing,
      fields: editing.fields.filter(f => f.name.trim()),
    };
    if (isNew) addEntity(cleaned);
    else updateEntity(cleaned);
    setEditing(null);
  };

  const updateField = (index: number, patch: Partial<EntityField>) => {
    if (!editing) return;
    setEditing({
      ...editing,
      fields: editing.fields.map((f, i) =>
        i === index ? { ...f, ...patch } : f,
      ),
    });
  };

  const removeField = (index: number) => {
    if (!editing) return;
    setEditing({
      ...editing,
      fields: editing.fields.filter((_, i) => i !== index),
    });
  };

  return (
    <PageShell
      title="Entities"
      description={`Define the data models for "${project.name}"`}
      actions={
        editing ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              onClick={save}
              disabled={!canSaveEntity}
              title={
                !canSaveEntity && editing.name.trim()
                  ? 'No changes to save'
                  : undefined
              }
            >
              <Save size={16} /> Save entity
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {project.entities.length > 0 && (
              <Button
                variant="danger"
                onClick={() => setDeleteAllOpen(true)}
              >
                <Trash2 size={16} /> Delete All
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() => setShowTemplates(!showTemplates)}
            >
              <Shuffle size={16} /> Templates
            </Button>
            <Button onClick={startCreate}>
              <Plus size={16} /> Add Entity
            </Button>
          </div>
        )
      }
    >
      {/* Template Packs */}
      {showTemplates && (
        <Card className="mb-4">
          <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-white">
            Entity Template Packs
          </h2>
          <p className="mb-4 text-sm text-zinc-500">
            Quickly add pre-defined entity sets for common use cases.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ENTITY_TEMPLATE_PACKS.map(pack => {
              const existingNames = new Set(project.entities.map(e => e.name));
              const alreadyAdded = pack.entities.every(e =>
                existingNames.has(e.name)
              );
              const partiallyAdded =
                !alreadyAdded &&
                pack.entities.some(e => existingNames.has(e.name));
              return (
                <div
                  key={pack.key}
                  className={`flex flex-col gap-2 rounded-lg border p-4 ${
                    alreadyAdded
                      ? 'border-zinc-200 bg-zinc-50 opacity-60 dark:border-zinc-800 dark:bg-zinc-900'
                      : 'border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{pack.icon}</span>
                    <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                      {pack.label}
                    </span>
                    <Badge>{pack.entities.length} entities</Badge>
                  </div>
                  <p className="text-xs text-zinc-500">{pack.description}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {pack.entities.slice(0, 4).map(e => (
                      <Badge
                        key={e.name}
                        variant={existingNames.has(e.name) ? 'default' : 'success'}
                      >
                        {e.name}
                      </Badge>
                    ))}
                    {pack.entities.length > 4 && (
                      <Badge>+{pack.entities.length - 4}</Badge>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant={alreadyAdded ? 'secondary' : 'primary'}
                    disabled={alreadyAdded}
                    onClick={() => addEntityTemplate(pack.key)}
                  >
                    {alreadyAdded
                      ? 'Added'
                      : partiallyAdded
                      ? 'Add Remaining'
                      : 'Add All'}
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Editor */}
      {editing && (
        <Card className="max-w-3xl">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
            {isNew ? 'New Entity' : `Edit "${editing.name}"`}
          </h2>
          <div className="flex flex-col gap-4">
            <Input
              label="Entity Name"
              id="entity-name"
              value={editing.name}
              onChange={e => setEditing({ ...editing, name: e.target.value })}
              placeholder="User"
              autoFocus
            />
            <Textarea
              label="Description"
              id="entity-desc"
              value={editing.description ?? ''}
              onChange={e =>
                setEditing({ ...editing, description: e.target.value })
              }
              rows={2}
            />

            {/* Fields */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Fields
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setEditing({
                      ...editing,
                      fields: [...editing.fields, emptyField()],
                    })
                  }
                >
                  <Plus size={14} /> Add Field
                </Button>
              </div>

              <div className="space-y-3">
                {editing.fields.map((field, idx) => (
                  <div
                    key={idx}
                    className="flex flex-wrap items-end gap-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700"
                  >
                    <Input
                      label="Name"
                      id={`field-name-${idx}`}
                      value={field.name}
                      onChange={e => updateField(idx, { name: e.target.value })}
                      placeholder="email"
                      className="flex-1"
                    />
                    <Select
                      label="Type"
                      id={`field-type-${idx}`}
                      value={field.type}
                      onChange={e =>
                        updateField(idx, {
                          type: e.target.value as EntityField['type'],
                        })
                      }
                      options={FIELD_TYPES}
                    />
                    <label className="flex items-center gap-1.5 pb-1 text-sm text-zinc-700 dark:text-zinc-300">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={e =>
                          updateField(idx, { required: e.target.checked })
                        }
                        className="rounded"
                      />
                      Required
                    </label>
                    {field.type === 'enum' && (
                      <Input
                        label="Values (comma-sep)"
                        id={`field-enum-${idx}`}
                        value={field.enumValues?.join(', ') ?? ''}
                        onChange={e =>
                          updateField(idx, {
                            enumValues: e.target.value
                              .split(',')
                              .map(v => v.trim())
                              .filter(Boolean),
                          })
                        }
                        placeholder="admin, user, guest"
                      />
                    )}
                    <Input
                      label="Default value (optional)"
                      id={`field-default-${idx}`}
                      value={field.defaultValue ?? ''}
                      onChange={e =>
                        updateField(idx, {
                          defaultValue: e.target.value.trim()
                            ? e.target.value
                            : undefined,
                        })
                      }
                      placeholder="Shown in UI when no runtime value"
                      className="min-w-[180px] flex-[2]"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeField(idx)}
                    >
                      <Trash2 size={14} className="text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-700">
              <Button
                onClick={save}
                disabled={!canSaveEntity}
                title={
                  !canSaveEntity && editing.name.trim()
                    ? 'No changes to save'
                    : undefined
                }
              >
                <Save size={16} className="mr-1.5" />
                {isNew ? 'Create entity' : 'Save changes'}
              </Button>
              <Button variant="secondary" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              {!isNew && !canSaveEntity && editing.name.trim() && (
                <span className="text-xs text-zinc-500">
                  No unsaved changes.
                </span>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* List */}
      {project.entities.length === 0 && !editing ? (
        <EmptyState
          icon={<Box size={48} />}
          title="No entities yet"
          description="Define your first data entity — like User, Product, Order."
          action={
            <Button onClick={startCreate}>
              <Plus size={16} /> Add Entity
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {project.entities.map(entity => {
            const isExpanded = expandedId === entity.id;
            return (
              <Card key={entity.id} className="p-0">
                {/* Clickable header */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : entity.id)}
                  className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                >
                  {isExpanded ? (
                    <ChevronDown size={16} className="shrink-0 text-zinc-400" />
                  ) : (
                    <ChevronRight
                      size={16}
                      className="shrink-0 text-zinc-400"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
                        {entity.name}
                      </h3>
                      <Badge>{entity.fields.length} fields</Badge>
                    </div>
                    {entity.description && (
                      <p className="mt-0.5 text-sm text-zinc-500 truncate">
                        {entity.description}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {entity.fields.slice(0, 4).map(f => (
                      <Badge
                        key={f.name}
                        variant={f.required ? 'warning' : 'default'}
                      >
                        {f.name}
                      </Badge>
                    ))}
                    {entity.fields.length > 4 && (
                      <Badge>+{entity.fields.length - 4}</Badge>
                    )}
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-zinc-200 dark:border-zinc-700">
                    <div className="p-4">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-zinc-200 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:border-zinc-700">
                            <th className="pb-2 pr-4">Name</th>
                            <th className="pb-2 pr-4">Type</th>
                            <th className="pb-2 pr-4">Required</th>
                            <th className="pb-2">Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          {entity.fields.map(f => (
                            <tr
                              key={f.name}
                              className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                            >
                              <td className="py-2 pr-4 font-medium text-zinc-900 dark:text-white">
                                {f.name}
                              </td>
                              <td className="py-2 pr-4">
                                <Badge
                                  variant={
                                    f.type === 'enum' ? 'warning' : 'default'
                                  }
                                >
                                  {f.type}
                                </Badge>
                                {f.type === 'enum' && f.enumValues?.length ? (
                                  <span className="ml-1.5 text-xs text-zinc-400">
                                    {f.enumValues.join(', ')}
                                  </span>
                                ) : null}
                              </td>
                              <td className="py-2 pr-4">
                                {f.required ? (
                                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                                    Yes
                                  </span>
                                ) : (
                                  <span className="text-xs text-zinc-400">
                                    No
                                  </span>
                                )}
                              </td>
                              <td className="py-2 text-zinc-500 dark:text-zinc-400">
                                {f.description || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex gap-2 border-t border-zinc-200 px-4 py-3 dark:border-zinc-700">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEdit(entity)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setEntityDeleteTarget({
                            id: entity.id,
                            name: entity.name,
                          })
                        }
                      >
                        <Trash2 size={14} className="text-red-500" />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
      <ConfirmModal
        open={deleteAllOpen}
        title="Delete all entities?"
        description={`Delete all ${project.entities.length} entities? This will also remove all relations. This cannot be undone.`}
        confirmLabel="Delete all"
        cancelLabel="Cancel"
        confirmVariant="danger"
        onConfirm={() => {
          deleteAllEntities();
          setDeleteAllOpen(false);
        }}
        onCancel={() => setDeleteAllOpen(false)}
      />
      <ConfirmModal
        open={!!entityDeleteTarget}
        title="Delete entity?"
        description={
          entityDeleteTarget
            ? `Delete “${entityDeleteTarget.name}”? This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmVariant="danger"
        onConfirm={() => {
          if (entityDeleteTarget) deleteEntity(entityDeleteTarget.id);
          setEntityDeleteTarget(null);
        }}
        onCancel={() => setEntityDeleteTarget(null)}
      />
    </PageShell>
  );
}
