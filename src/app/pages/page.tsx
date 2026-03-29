'use client';

import {
  Layout,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  ExternalLink,
  FileCode,
  Search,
  Database,
  Wrench,
  Info,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragMoveEvent,
  type DragEndEvent,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';

import PageShell from '@/components/PageShell';
import { Button, Card, ConfirmModal, EmptyState, Input } from '@/components/ui';
import { useProjectStore } from '@/store/projectStore';
import type { UIPage, UIComponentTemplate } from '@/types/project';

import { ComponentPalette } from '@/components/designer/ComponentPalette';
import { PagePreview } from '@/components/designer/PagePreview';
import {
  PageRuntimeProvider,
  type EntityValuesSnapshot,
} from '@/components/designer/PageRuntimeContext';
import { useActionLog } from '@/components/designer/ActionLogContext';
import {
  SwaggenEmbeddedEditor,
  type SwaggenEmbeddedEditorHandle,
} from '@/components/swaggen/SwaggenEmbeddedEditor';
import { SwaggenTemplateThumbnail } from '@/components/swaggen/SwaggenTemplateThumbnail';
import { toSlug } from '@/lib/projectRegistry';
import { PAGE_TEMPLATES } from '@/lib/pageTemplates';
import type { PageTemplate } from '@/lib/pageTemplates';
import {
  SWAGGEN_LAYOUT_TEMPLATES,
  getSwaggenLayoutTemplate,
  getPresetDimensionsLabel,
  getPresetDisplayName,
  type SwaggenLayoutTemplateDefinition,
} from '@/lib/swaggenTemplatesRegistry';
import {
  BLANK_CANVAS_PREVIEW_SRC,
  DETAIL_VIEW_APP_STARTER_PREVIEW_SRC,
} from '@/lib/templatePreviewAssets';
import {
  buildBlankSwaggenPage,
  buildUIPageFromSwaggenLayout,
  buildUIPageFromPageTemplate,
  PAGE_TEMPLATE_LAYOUT_MAP,
} from '@/lib/pageAppStarters';
import { ARTBOARD_PRESETS, createEmptyDocument } from '@/lib/swaggenPresets';
import { concretePathForPublicSite } from '@/lib/sitePagePath';
import { registerProjectOnServer } from '@/lib/registerProjectOnServer';
import { downloadSwaggenPageHtmlFile } from '@/lib/exportSwaggenPageCode';
import {
  pageHasSwaggenCanvas,
  pageHasInteractiveComponents,
} from '@/lib/publicPageRender';
import { COMPONENT_TEMPLATE_REGISTRY } from '@/lib/componentTemplateRegistry';
import {
  sidebarInteractiveTileClass,
  sidebarInteractiveTileIconClass,
  sidebarInteractiveTileLabelClass,
} from '@/lib/swaggenSidebarStyles';
import {
  applyEntityToSwaggenLayer,
  applyFieldToSwaggenLayer,
  dedupeSwaggenElements,
  mergeSwaggenPageUiState,
  widgetElementsFromSwaggenDoc,
} from '@/lib/swaggenWidgetBridge';

const COMPONENT_TEMPLATES = COMPONENT_TEMPLATE_REGISTRY;

/** Preview URL for a saved page path. Use with `<a>`, not Next `<Link>`. */
function publicSiteHref(projectName: string, pagePath: string): string {
  const slug = toSlug(projectName);
  const p = concretePathForPublicSite(pagePath);
  return p === '/' ? `/site/${slug}` : `/site/${slug}${p}`;
}

interface DragData {
  type:
    | 'template'
    | 'entity'
    | 'field'
    | 'canvas-item'
    | 'component-drop-zone'
    | 'canvas-drop-zone';
  template?: UIComponentTemplate;
  label?: string;
  entityId?: string;
  fieldName?: string;
  fieldType?: string;
  name?: string;
  componentId?: string;
}

export default function FrontendPagesPage() {
  return <FrontendPagesPageInner />;
}

function FrontendPagesPageInner() {
  const project = useProjectStore(s => s.activeProject());
  const addPage = useProjectStore(s => s.addPage);
  const updatePage = useProjectStore(s => s.updatePage);
  const deletePage = useProjectStore(s => s.deletePage);
  const { log } = useActionLog();

  const [editingPage, setEditingPage] = useState<UIPage | null>(null);
  const [isNewPage, setIsNewPage] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [showTemplateChooser, setShowTemplateChooser] = useState(false);
  const [templateFilter, setTemplateFilter] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeDragData, setActiveDragData] = useState<DragData | null>(null);
  const [hoveredComponentId, setHoveredComponentId] = useState<string | null>(
    null,
  );
  const [pageDeleteTarget, setPageDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const swaggenEditorRef = useRef<SwaggenEmbeddedEditorHandle>(null);
  const runtimeSnapshotRef = useRef<(() => EntityValuesSnapshot) | null>(null);

  const insertFieldFromPalette = (
    entityId: string,
    fieldName: string,
    fieldType: string,
  ) => {
    const ok =
      swaggenEditorRef.current?.insertFieldIntoSelection(
        entityId,
        fieldName,
        fieldType,
      ) ?? false;
    if (ok) {
      log('success', 'Field inserted', `{${fieldName}} on selected layer`);
    } else {
      log(
        'warning',
        'Select a layer first',
        'Click a text or widget layer on the canvas, then click a field button.',
      );
    }
  };

  const activeDragDataRef = useRef<DragData | null>(null);
  const hoveredComponentIdRef = useRef<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const q = templateFilter.trim().toLowerCase();

  const filteredGallery = useMemo(() => {
    const matchesBlank =
      !q ||
      ['blank', 'empty', 'canvas', 'start', 'new'].some(k => q.includes(k));

    const matchesApp = (tpl: PageTemplate) =>
      !q ||
      tpl.name.toLowerCase().includes(q) ||
      tpl.description.toLowerCase().includes(q);

    const matchesLayoutGallery = (t: SwaggenLayoutTemplateDefinition) =>
      !q ||
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.tags.some(tag => tag.includes(q));

    type Row =
      | { kind: 'blank' }
      | { kind: 'app'; tpl: PageTemplate }
      | { kind: 'layout'; t: SwaggenLayoutTemplateDefinition };

    const rows: Row[] = [];
    if (matchesBlank) rows.push({ kind: 'blank' });
    PAGE_TEMPLATES.forEach(tpl => {
      if (matchesApp(tpl)) rows.push({ kind: 'app', tpl });
    });
    SWAGGEN_LAYOUT_TEMPLATES.forEach(t => {
      if (matchesLayoutGallery(t)) rows.push({ kind: 'layout', t });
    });
    return rows;
  }, [q]);

  const getPointerFromEvent = (
    activatorEvent: Event,
    delta: { x: number; y: number },
  ) => {
    const e = activatorEvent as PointerEvent;
    return { x: e.clientX + delta.x, y: e.clientY + delta.y };
  };

  if (!project) {
    return (
      <PageShell title="Frontend Pages">
        <EmptyState
          icon={<Layout size={48} />}
          title="No project selected"
          description="Select or create a project on the Dashboard first."
        />
      </PageShell>
    );
  }

  const startCreatePage = () => setShowTemplateChooser(true);

  const startBlankPage = () => {
    setEditingPage(buildBlankSwaggenPage());
    setIsNewPage(true);
    setIsPreview(false);
    setShowTemplateChooser(false);
  };

  const applyPageStarterTemplate = (template: PageTemplate) => {
    const page = buildUIPageFromPageTemplate(template);
    setEditingPage(page);
    setIsNewPage(true);
    setIsPreview(false);
    setShowTemplateChooser(false);
    log('success', 'App template applied', template.name);
  };

  const applyLayoutGalleryTemplate = (layoutTemplateId: string, name: string) => {
    const page = buildUIPageFromSwaggenLayout(layoutTemplateId, name);
    setEditingPage(page);
    setIsNewPage(true);
    setIsPreview(false);
    setShowTemplateChooser(false);
    log('success', 'Design template', name);
  };

  const clonePageForEditor = (page: UIPage): UIPage => {
    const comps = page.components ?? [];
    if (page.editorMode === 'swaggen' && page.swaggenDocument) {
      return mergeSwaggenPageUiState({
        ...page,
        components: comps.map(c => ({ ...c })),
        swaggenDocument: {
          ...page.swaggenDocument,
          elements: page.swaggenDocument.elements.map(el => ({ ...el })),
          name: page.name.trim() || page.swaggenDocument.name,
        },
      });
    }
    const base: UIPage = {
      ...page,
      editorMode: 'swaggen',
      components: comps.map(c => ({ ...c })),
      swaggenDocument: page.swaggenDocument
        ? {
            ...page.swaggenDocument,
            elements: page.swaggenDocument.elements.map(el => ({ ...el })),
          }
        : createEmptyDocument(ARTBOARD_PRESETS[0], page.name || 'Page'),
    };
    return mergeSwaggenPageUiState(base);
  };

  const startEditPage = (page: UIPage) => {
    setEditingPage(clonePageForEditor(page));
    setIsNewPage(false);
    setIsPreview(false);
  };

  const startPreviewPage = (page: UIPage) => {
    setEditingPage(clonePageForEditor(page));
    setIsNewPage(false);
    setIsPreview(true);
  };

  const persistPage = async (closeAfter: boolean) => {
    if (!editingPage || !editingPage.name.trim()) return;
    const doc = editingPage.swaggenDocument;
    if (!doc) return;

    const snap = runtimeSnapshotRef.current?.();
    const previewEntityValues =
      snap &&
      Object.keys(snap).some(
        eid => snap[eid] && Object.keys(snap[eid]).length > 0,
      )
        ? snap
        : undefined;

    const elements = dedupeSwaggenElements(doc.elements);
    const widgetComps = widgetElementsFromSwaggenDoc(elements);
    const pageToSave: UIPage = {
      ...editingPage,
      editorMode: 'swaggen',
      components: widgetComps,
      swaggenDocument: {
        ...doc,
        name: editingPage.name.trim(),
        elements,
      },
      previewEntityValues,
    };

    if (isNewPage) {
      addPage(pageToSave);
      setIsNewPage(false);
      log(
        'success',
        'Page created',
        `${pageToSave.name} · ${pageToSave.swaggenDocument?.elements.length ?? 0} canvas layers · ${widgetComps.length} widgets`,
      );
    } else {
      updatePage(pageToSave);
      log(
        'success',
        closeAfter ? 'Page saved' : 'UI changes saved',
        closeAfter
          ? pageToSave.name
          : `${pageToSave.name} · ${widgetComps.length} widgets synced`,
      );
    }

    if (closeAfter) {
      setEditingPage(null);
      setIsPreview(false);
    } else {
      setEditingPage(pageToSave);
    }

    const p = useProjectStore.getState().activeProject();
    if (p) await registerProjectOnServer(p);
  };

  const exportPageHtml = () => {
    if (!editingPage?.swaggenDocument) return;
    downloadSwaggenPageHtmlFile(editingPage.swaggenDocument, editingPage.name);
    log('success', 'Exported', 'Standalone HTML file downloaded');
  };

  const handleDragStart = (event: DragStartEvent) => {
    const dragData = event.active.data.current as DragData;
    setActiveId(event.active.id as string);
    setActiveDragData(dragData);
    activeDragDataRef.current = dragData;
    setHoveredComponentId(null);
    hoveredComponentIdRef.current = null;
  };

  const handleDragMove = (event: DragMoveEvent) => {
    const dragData = activeDragDataRef.current;
    if (!dragData) return;
    const dragType = dragData.type;
    if (dragType === 'entity' || dragType === 'field') {
      const overIdStr = event.over?.id?.toString() ?? '';
      if (overIdStr.startsWith('swaggen-bind-')) {
        const elementId = overIdStr.replace('swaggen-bind-', '');
        hoveredComponentIdRef.current = elementId;
        setHoveredComponentId(elementId);
        return;
      }
      const overComp = event.over?.data.current?.componentId as
        | string
        | undefined;
      hoveredComponentIdRef.current = overComp || null;
      setHoveredComponentId(overComp || null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const lastHoveredId = hoveredComponentIdRef.current;
    setActiveId(null);
    setActiveDragData(null);
    activeDragDataRef.current = null;
    setHoveredComponentId(null);
    hoveredComponentIdRef.current = null;

    if (!editingPage?.swaggenDocument) return;

    const doc = editingPage.swaggenDocument;
    const overIdStr = over?.id?.toString() ?? '';
    const canvasBindId = overIdStr.startsWith('swaggen-bind-')
      ? overIdStr.replace('swaggen-bind-', '')
      : ((over?.data.current?.elementId as string | undefined) ?? null);

    if (active.data.current?.type === 'template' && over) {
      const isOverCanvas = over?.id === 'canvas-droppable';
      if (!isOverCanvas || !swaggenEditorRef.current) return;

      const template = active.data.current.template as UIComponentTemplate;
      const label = active.data.current.label as string;
      const pointer = getPointerFromEvent(event.activatorEvent, event.delta);
      const canvasEl = document.getElementById('designer-canvas');
      const canvasRect = canvasEl?.getBoundingClientRect();
      const aw = doc.artboardWidth;
      const ah = doc.artboardHeight;
      let newX = 0;
      let newY = 0;
      if (canvasRect && canvasRect.width > 0 && canvasRect.height > 0) {
        newX = ((pointer.x - canvasRect.left) / canvasRect.width) * aw;
        newY = ((pointer.y - canvasRect.top) / canvasRect.height) * ah;
      }
      newX = Math.max(0, Math.min(aw, newX));
      newY = Math.max(0, Math.min(ah, newY));

      swaggenEditorRef.current.addWidgetTemplateAt(template, label, newX, newY);
      log('success', 'Widget added', `${label} (${template})`);
      return;
    }

    if (active.data.current?.type === 'entity') {
      const targetElementId = canvasBindId || lastHoveredId;
      if (!targetElementId) return;

      const entityId = active.data.current.entityId as string;
      const entityName = active.data.current.name as string;
      setEditingPage(ep => {
        if (!ep?.swaggenDocument) return ep;
        const elements = ep.swaggenDocument.elements.map(el => {
          if (el.id !== targetElementId) return el;
          return applyEntityToSwaggenLayer(el, entityId);
        });
        return {
          ...ep,
          swaggenDocument: { ...ep.swaggenDocument, elements },
        };
      });
      log('info', 'Entity linked', `${entityName} → layer`);
      return;
    }

    if (active.data.current?.type === 'field') {
      const targetElementId = canvasBindId || lastHoveredId;
      if (!targetElementId) return;

      const droppedEntityId = active.data.current.entityId as string;
      const droppedFieldName = active.data.current.fieldName as string;
      const droppedFieldType = active.data.current.fieldType as string;

      setEditingPage(ep => {
        if (!ep?.swaggenDocument) return ep;
        const elements = ep.swaggenDocument.elements.map(el => {
          if (el.id !== targetElementId) return el;
          const next = applyFieldToSwaggenLayer(
            el,
            droppedEntityId,
            droppedFieldName,
            droppedFieldType,
          );
          return next ?? el;
        });
        return {
          ...ep,
          swaggenDocument: { ...ep.swaggenDocument, elements },
        };
      });
      log(
        'info',
        'Field linked',
        `${droppedFieldName} → ${targetElementId.slice(0, 8)}…`,
      );
      return;
    }
  };

  return (
    <PageShell
      title="Frontend Pages"
      description={`Design pages for “${project.name}” — saved pages are available at a public URL after registration syncs.`}
      actions={
        !editingPage &&
        !showTemplateChooser && (
          <Button onClick={startCreatePage}>
            <Plus size={16} /> Create Page
          </Button>
        )
      }
    >
      {showTemplateChooser && (
        <div className="space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                New page
              </h2>
              <p className="text-sm text-zinc-500">
                Browse one gallery: blank canvas, app starters, and design
                layouts — each card shows a visual preview.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTemplateChooser(false)}
            >
              <X size={16} /> Cancel
            </Button>
          </div>

          <div className="w-full min-w-0 space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
                Templates
              </h3>
              <span className="text-xs text-zinc-500">
                {1 + PAGE_TEMPLATES.length + SWAGGEN_LAYOUT_TEMPLATES.length} options
              </span>
            </div>

            <div className="relative max-w-lg">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                size={16}
              />
              <Input
                value={templateFilter}
                onChange={e => setTemplateFilter(e.target.value)}
                placeholder="Search by name, tag, or try “blank”…"
                className="pl-9 h-10"
              />
            </div>

            <div className="grid max-h-[min(82vh,880px)] min-w-0 grid-cols-1 gap-6 overflow-y-auto pb-2 pr-1 md:grid-cols-2">
              {filteredGallery.map(row => {
                if (row.kind === 'blank') {
                  return (
                    <button
                      key="blank"
                      type="button"
                      onClick={startBlankPage}
                      className="group flex w-full min-w-0 flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white text-left transition hover:border-violet-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-950 dark:hover:border-violet-600"
                    >
                      <div className="min-w-0 shrink-0 border-b border-zinc-200/80 dark:border-zinc-700">
                        <SwaggenTemplateThumbnail
                          presetId="social-wide"
                          preview={{
                            background:
                              'linear-gradient(135deg, #f4f4f5 0%, #e4e4e7 100%)',
                            layout: 'minimal',
                            minimalOn: 'light',
                          }}
                          variant="gallery"
                          coverSrc={BLANK_CANVAS_PREVIEW_SRC}
                          coverAlt="Blank canvas"
                        />
                      </div>
                      <div className="space-y-1.5 px-4 pb-4 pt-3">
                        <p className="text-sm font-semibold leading-snug text-zinc-900 dark:text-zinc-50">
                          Blank canvas
                        </p>
                        <p className="line-clamp-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                          Empty artboard — add layers from scratch.
                        </p>
                        <span className="inline-flex rounded bg-zinc-100 px-1.5 py-0.5 text-[9px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                          Start from zero
                        </span>
                      </div>
                    </button>
                  );
                }

                if (row.kind === 'app') {
                  const tpl = row.tpl;
                  const layoutTemplateId =
                    tpl.id === 'detail-view'
                      ? null
                      : PAGE_TEMPLATE_LAYOUT_MAP[tpl.id] ?? 'ig-purple-brand';
                  const def = layoutTemplateId
                    ? getSwaggenLayoutTemplate(layoutTemplateId)
                    : null;
                  return (
                    <button
                      key={`app-${tpl.id}`}
                      type="button"
                      onClick={() => applyPageStarterTemplate(tpl)}
                      className="group flex w-full min-w-0 flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white text-left transition hover:border-violet-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-950 dark:hover:border-violet-600"
                    >
                      <div className="min-w-0 shrink-0 border-b border-zinc-200/80 dark:border-zinc-700">
                        {def ? (
                          <SwaggenTemplateThumbnail
                            presetId={def.presetId}
                            preview={def.preview}
                            variant="gallery"
                            templateId={def.id}
                            coverAlt={`${def.name} preview`}
                          />
                        ) : tpl.id === 'detail-view' ? (
                          <SwaggenTemplateThumbnail
                            presetId="presentation"
                            preview={{
                              background: '#f8fafc',
                              layout: 'minimal',
                            }}
                            variant="gallery"
                            coverSrc={DETAIL_VIEW_APP_STARTER_PREVIEW_SRC}
                            coverAlt={`${tpl.name} layout preview`}
                          />
                        ) : (
                          <div className="flex min-h-[200px] w-full items-center justify-center overflow-hidden rounded-t-xl bg-gradient-to-br from-zinc-100 to-zinc-200 text-5xl sm:min-h-[240px] md:min-h-[280px] dark:from-zinc-800 dark:to-zinc-900">
                            {tpl.icon}
                          </div>
                        )}
                      </div>
                      <div className="space-y-1.5 px-4 pb-4 pt-3">
                        <p className="line-clamp-2 text-sm font-semibold leading-snug text-zinc-900 dark:text-zinc-50">
                          <span className="mr-1.5" aria-hidden>
                            {tpl.icon}
                          </span>
                          {tpl.name}
                        </p>
                        <p className="line-clamp-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                          {tpl.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-1 pt-0.5">
                          <span className="inline-flex max-w-full truncate rounded bg-violet-100 px-1.5 py-0.5 text-[9px] font-medium text-violet-800 dark:bg-violet-950/80 dark:text-violet-200">
                            App starter
                          </span>
                          {tpl.id === 'detail-view' ? (
                            <>
                              <span className="inline-flex max-w-full truncate rounded bg-zinc-100 px-1.5 py-0.5 text-[9px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                                Presentation · 16:9
                              </span>
                              <span className="text-[9px] tabular-nums text-zinc-400">
                                1920 × 1080
                              </span>
                            </>
                          ) : (
                            def && (
                              <>
                                <span className="inline-flex max-w-full truncate rounded bg-zinc-100 px-1.5 py-0.5 text-[9px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                                  {getPresetDisplayName(def.presetId)}
                                </span>
                                <span className="text-[9px] tabular-nums text-zinc-400">
                                  {getPresetDimensionsLabel(def.presetId)}
                                </span>
                              </>
                            )
                          )}
                        </div>
                      </div>
                    </button>
                  );
                }

                const t = row.t;
                return (
                  <button
                    key={`gallery-${t.id}`}
                    type="button"
                    onClick={() => applyLayoutGalleryTemplate(t.id, t.name)}
                    className="group flex w-full min-w-0 flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white text-left transition hover:border-violet-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-950 dark:hover:border-violet-600"
                  >
                    <div className="min-w-0 shrink-0 border-b border-zinc-200/80 dark:border-zinc-700">
                      <SwaggenTemplateThumbnail
                        presetId={t.presetId}
                        preview={t.preview}
                        variant="gallery"
                        templateId={t.id}
                        coverAlt={`${t.name} preview`}
                      />
                    </div>
                    <div className="space-y-1.5 px-4 pb-4 pt-3">
                      <p className="line-clamp-2 text-sm font-semibold leading-snug text-zinc-900 dark:text-zinc-50">
                        {t.name}
                      </p>
                      <p className="line-clamp-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                        {t.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-1 pt-0.5">
                        <span className="inline-flex max-w-full truncate rounded bg-zinc-100 px-1.5 py-0.5 text-[9px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                          {getPresetDisplayName(t.presetId)}
                        </span>
                        <span className="text-[9px] tabular-nums text-zinc-400">
                          {getPresetDimensionsLabel(t.presetId)}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            {filteredGallery.length === 0 && (
              <p className="text-sm text-zinc-500 py-6">No templates match.</p>
            )}
          </div>
        </div>
      )}

      {editingPage && editingPage.swaggenDocument ? (
        <PageRuntimeProvider
          key={editingPage.id}
          initialEntityValues={editingPage.previewEntityValues}
          snapshotRef={runtimeSnapshotRef}
        >
          <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm sticky top-0 z-20">
            <div className="flex items-center gap-4 flex-1 min-w-0 max-w-2xl">
              <Input
                value={editingPage.name}
                onChange={e => {
                  const name = e.target.value;
                  setEditingPage(ep => {
                    if (!ep?.swaggenDocument) return ep;
                    const trimmed = name.trim();
                    return {
                      ...ep,
                      name,
                      swaggenDocument: {
                        ...ep.swaggenDocument,
                        name: trimmed || ep.swaggenDocument.name,
                      },
                    };
                  });
                }}
                placeholder="Page title"
                className="h-9"
                autoFocus
              />
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-zinc-400 text-sm shrink-0">/</span>
                <Input
                  value={editingPage.path}
                  onChange={e =>
                    setEditingPage({ ...editingPage, path: e.target.value })
                  }
                  placeholder="url path (empty = home)"
                  className="h-9 min-w-0"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={publicSiteHref(project.name, editingPage.path)}
                target="_blank"
                rel="noopener noreferrer"
                title="Requires project sync (automatic after save)"
                className="inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors bg-white text-zinc-700 border border-zinc-300 hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700 dark:hover:bg-zinc-700 px-4 py-2 text-sm h-9"
              >
                <ExternalLink size={16} />
                Public URL
              </a>
              <Button
                type="button"
                variant="secondary"
                className="h-9"
                onClick={exportPageHtml}
              >
                <FileCode size={16} className="mr-2" />
                Export HTML
              </Button>
              <Button
                type="button"
                variant={isPreview ? 'primary' : 'secondary'}
                onClick={() => setIsPreview(!isPreview)}
                className="h-9"
              >
                {isPreview ? 'Edit' : 'Preview'}
              </Button>
              <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800 mx-1 hidden sm:block" />
              <Button
                type="button"
                onClick={() => void persistPage(false)}
                disabled={!editingPage.name.trim()}
                className="h-9"
                title="Write canvas and widgets to the project; keep editing"
              >
                <Save size={16} className="mr-2" />
                {isNewPage ? 'Create' : 'Save'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => void persistPage(true)}
                disabled={!editingPage.name.trim()}
                className="h-9"
                title="Save and return to the page list"
              >
                <Save size={16} className="mr-2" />
                {isNewPage ? 'Create & close' : 'Save & close'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditingPage(null)}
                className="h-9"
              >
                <X size={16} className="mr-2" />
                Cancel
              </Button>
            </div>
          </div>

          {!isPreview && (
            <details className="rounded-lg border border-sky-200 bg-sky-50/90 text-sm text-sky-950 dark:border-sky-800 dark:bg-sky-950/25 dark:text-sky-100">
              <summary className="cursor-pointer list-none px-4 py-2.5 font-medium [&::-webkit-details-marker]:hidden flex items-center gap-2">
                <Info
                  className="shrink-0 text-sky-600 dark:text-sky-400"
                  size={16}
                />
                Page editor tips
                <span className="text-xs font-normal text-sky-700/80 dark:text-sky-300/80">
                  (click to expand)
                </span>
              </summary>
              <div className="space-y-2 border-t border-sky-200/80 px-4 py-3 leading-relaxed dark:border-sky-800/80">
                <p>
                  Add <strong>widgets</strong> from the left or drag templates onto
                  the canvas. Select a layer → <strong>Layers</strong> in the
                  sidebar for binding and widget settings.
                </p>
                <p>
                  <strong>Entities:</strong> click a field name in the palette to
                  insert{' '}
                  <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
                    {'{fieldName}'}
                  </code>{' '}
                  into the selected layer, or drag onto the canvas.
                </p>
              </div>
            </details>
          )}

          {isPreview ? (
            <div className="animate-in fade-in zoom-in duration-300">
              <PagePreview
                page={editingPage}
                entities={project.entities}
                embedRuntime={false}
              />
            </div>
          ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={pointerWithin}
                onDragStart={handleDragStart}
                onDragMove={handleDragMove}
                onDragEnd={handleDragEnd}
                modifiers={[restrictToWindowEdges]}
              >
                <div className="animate-in fade-in duration-300">
                  <SwaggenEmbeddedEditor
                    ref={swaggenEditorRef}
                    document={editingPage.swaggenDocument}
                    onChange={next =>
                      setEditingPage(ep => {
                        if (!ep) return ep;
                        const title = ep.name.trim();
                        return {
                          ...ep,
                          swaggenDocument: {
                            ...next,
                            name: title || next.name,
                            elements: dedupeSwaggenElements(next.elements),
                          },
                        };
                      })
                    }
                    projectId={project.id}
                    shellClassName="min-h-[min(72vh,780px)] max-h-[min(92vh,1150px)]"
                    interactiveDropZone
                    entities={project.entities}
                    enableBindingDnd
                    widgetTemplateCatalog={COMPONENT_TEMPLATES}
                    interactiveFieldPreview
                    onFieldNameClick={insertFieldFromPalette}
                    leftSidebarExtra={
                      <ComponentPalette
                        entities={project.entities}
                        templates={COMPONENT_TEMPLATES}
                        variant="embedded"
                        showComponentTemplates={false}
                        interactiveFieldValues
                        onFieldInsert={insertFieldFromPalette}
                        onSaveFieldValues={() => void persistPage(false)}
                        saveFieldValuesDisabled={!editingPage.name.trim()}
                      />
                    }
                  />
                </div>

                <DragOverlay
                  dropAnimation={{
                    sideEffects: defaultDropAnimationSideEffects({
                      styles: {
                        active: {
                          opacity: '0.5',
                        },
                      },
                    }),
                  }}
                  style={{ pointerEvents: 'none' }}
                >
                  {activeId ? (
                    activeDragData?.type === 'template' ? (
                      <div
                        className={`${sidebarInteractiveTileClass} w-36 rotate-3 border-violet-400 shadow-2xl ring-2 ring-violet-200 dark:border-violet-500 dark:ring-violet-900/50`}
                      >
                        <Plus
                          size={18}
                          className={sidebarInteractiveTileIconClass}
                          strokeWidth={2.25}
                        />
                        <span className={sidebarInteractiveTileLabelClass}>
                          {activeDragData.label}
                        </span>
                      </div>
                    ) : activeDragData?.type === 'entity' ? (
                      <div className="flex items-center gap-3 p-3 rounded-lg border-2 border-amber-500 bg-white dark:bg-zinc-900 shadow-2xl w-48 rotate-3">
                        <div className="w-8 h-8 rounded bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600">
                          <Database size={16} />
                        </div>
                        <span className="text-xs font-bold text-zinc-900 dark:text-white">
                          {activeDragData.name}
                        </span>
                      </div>
                    ) : activeDragData?.type === 'field' ? (
                      <div className="flex items-center gap-3 p-2 rounded-lg border-2 border-amber-500 bg-white dark:bg-zinc-900 shadow-2xl w-40 rotate-3">
                        <div className="w-6 h-6 rounded bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-600">
                          <Wrench size={12} />
                        </div>
                        <span className="text-[10px] font-bold text-zinc-900 dark:text-white">
                          {activeDragData.fieldName}
                        </span>
                      </div>
                    ) : null
                  ) : null}
                </DragOverlay>
              </DndContext>
          )}
          </div>
        </PageRuntimeProvider>
      ) : (
        <>
          {project.pages.length === 0 ? (
            <EmptyState
              icon={<Layout size={48} />}
              title="No pages yet"
              description="Create a page in the Swaggen visual editor — templates included."
              action={
                <Button onClick={startCreatePage}>
                  <Plus size={16} /> Create Page
                </Button>
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {project.pages.map(page => {
                const hasCanvas = pageHasSwaggenCanvas(page);
                const hasUi = pageHasInteractiveComponents(page);
                return (
                  <Card
                    key={page.id}
                    className="group flex flex-col justify-between transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => startPreviewPage(page)}
                      className="text-left p-4 flex-1 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-t-lg"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-base font-semibold text-zinc-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                          {page.name}
                        </h3>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <div className="flex flex-wrap justify-end gap-1">
                            {hasCanvas && (
                              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200">
                                Canvas
                              </span>
                            )}
                            {hasUi && (
                              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100">
                                UI
                              </span>
                            )}
                            {!hasCanvas && !hasUi && (
                              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                                Empty
                              </span>
                            )}
                          </div>
                          <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                            {page.path || '/ (main)'}
                          </code>
                        </div>
                      </div>
                      {page.description && (
                        <p className="mt-1 text-sm text-zinc-500 line-clamp-2">
                          {page.description}
                        </p>
                      )}
                      <div className="mt-3 text-[10px] text-zinc-500">
                        {page.swaggenDocument?.elements.length ?? 0} canvas layer
                        {(page.swaggenDocument?.elements.length ?? 0) === 1
                          ? ''
                          : 's'}
                        {hasUi &&
                          ` · ${page.components.length} UI component${page.components.length === 1 ? '' : 's'}`}
                      </div>
                    </button>
                    <div className="flex items-center justify-end gap-1 p-2 border-t border-zinc-100 dark:border-zinc-800">
                      <a
                        href={publicSiteHref(project.name, page.path)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open public page"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
                      >
                        <ExternalLink size={15} />
                      </a>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEditPage(page)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit2 size={15} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setPageDeleteTarget({ id: page.id, name: page.name })
                        }
                        className="h-8 w-8 p-0 text-red-500"
                      >
                        <Trash2 size={15} />
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
      <ConfirmModal
        open={!!pageDeleteTarget}
        title="Delete page?"
        description={
          pageDeleteTarget
            ? `Delete “${pageDeleteTarget.name}”? This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmVariant="danger"
        onConfirm={() => {
          if (!pageDeleteTarget) return;
          deletePage(pageDeleteTarget.id);
          log('warning', 'Page deleted', pageDeleteTarget.name);
          setPageDeleteTarget(null);
          const p = useProjectStore.getState().activeProject();
          if (p) void registerProjectOnServer(p);
        }}
        onCancel={() => setPageDeleteTarget(null)}
      />
    </PageShell>
  );
}
