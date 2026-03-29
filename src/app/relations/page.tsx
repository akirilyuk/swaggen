'use client';

import { Link2, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
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
} from '@/components/ui';
import { useProjectStore } from '@/store/projectStore';
import type { EntityRelation, RelationType } from '@/types/project';

const RELATION_TYPES: { value: RelationType; label: string }[] = [
  { value: 'one-to-one', label: 'One-to-One' },
  { value: 'one-to-many', label: 'One-to-Many' },
  { value: 'many-to-one', label: 'Many-to-One' },
  { value: 'many-to-many', label: 'Many-to-Many' },
];

export default function RelationsPage() {
  const project = useProjectStore(s => s.activeProject());
  const addRelation = useProjectStore(s => s.addRelation);
  const deleteRelation = useProjectStore(s => s.deleteRelation);

  const [editing, setEditing] = useState<EntityRelation | null>(null);
  const [relationDeleteId, setRelationDeleteId] = useState<string | null>(null);

  if (!project) {
    return (
      <PageShell title="Relations">
        <EmptyState
          icon={<Link2 size={48} />}
          title="No project selected"
          description="Select or create a project on the Dashboard first."
        />
      </PageShell>
    );
  }

  const entities = project.entities;
  const entityOptions = entities.map(e => ({ value: e.id, label: e.name }));

  const startCreate = () => {
    setEditing({
      id: uuidV4(),
      sourceEntityId: entities[0]?.id ?? '',
      targetEntityId: entities[0]?.id ?? '',
      type: 'one-to-many',
      fieldName: '',
      description: '',
    });
  };

  const save = () => {
    if (!editing || !editing.fieldName.trim()) return;
    addRelation(editing);
    setEditing(null);
  };

  const entityName = (id: string) =>
    entities.find(e => e.id === id)?.name ?? 'Unknown';

  return (
    <PageShell
      title="Relations"
      description={`Define how entities relate to each other in "${project.name}"`}
      actions={
        <Button onClick={startCreate} disabled={entities.length < 2}>
          <Plus size={16} /> Add Relation
        </Button>
      }
    >
      {entities.length < 2 && (
        <Card>
          <p className="text-sm text-zinc-500">
            You need at least 2 entities before creating relations. Go to the
            Entities page first.
          </p>
        </Card>
      )}

      {editing && (
        <Card className="max-w-lg">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
            New Relation
          </h2>
          <div className="flex flex-col gap-4">
            <Select
              label="Source Entity"
              id="rel-source"
              value={editing.sourceEntityId}
              onChange={e =>
                setEditing({ ...editing, sourceEntityId: e.target.value })
              }
              options={entityOptions}
            />
            <Select
              label="Relation Type"
              id="rel-type"
              value={editing.type}
              onChange={e =>
                setEditing({
                  ...editing,
                  type: e.target.value as RelationType,
                })
              }
              options={RELATION_TYPES}
            />
            <Select
              label="Target Entity"
              id="rel-target"
              value={editing.targetEntityId}
              onChange={e =>
                setEditing({ ...editing, targetEntityId: e.target.value })
              }
              options={entityOptions}
            />
            <Input
              label="Field Name"
              id="rel-field"
              value={editing.fieldName}
              onChange={e =>
                setEditing({ ...editing, fieldName: e.target.value })
              }
              placeholder="e.g. posts, author, items"
            />
            <div className="flex gap-2">
              <Button onClick={save} disabled={!editing.fieldName.trim()}>
                Create
              </Button>
              <Button variant="secondary" onClick={() => setEditing(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {project.relations.length === 0 && !editing ? (
        <EmptyState
          icon={<Link2 size={48} />}
          title="No relations defined"
          description="Link your entities together with relations."
          action={
            entities.length >= 2 ? (
              <Button onClick={startCreate}>
                <Plus size={16} /> Add Relation
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {project.relations.map(rel => (
            <Card key={rel.id}>
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-white">
                <span>{entityName(rel.sourceEntityId)}</span>
                <Badge>{rel.type}</Badge>
                <span>{entityName(rel.targetEntityId)}</span>
              </div>
              <p className="mt-1 text-sm text-zinc-500">
                Field: <code className="text-blue-600">{rel.fieldName}</code>
              </p>
              <div className="mt-3 flex gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRelationDeleteId(rel.id)}
                >
                  <Trash2 size={14} className="text-red-500" /> Remove
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <ConfirmModal
        open={relationDeleteId !== null}
        title="Remove relation?"
        description="This relation will be removed from the project. You can add it again later."
        confirmLabel="Remove"
        cancelLabel="Cancel"
        confirmVariant="danger"
        onConfirm={() => {
          if (relationDeleteId) deleteRelation(relationDeleteId);
          setRelationDeleteId(null);
        }}
        onCancel={() => setRelationDeleteId(null)}
      />
    </PageShell>
  );
}
