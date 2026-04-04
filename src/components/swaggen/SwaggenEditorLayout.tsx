'use client';

import { useDroppable } from '@dnd-kit/core';
import {
  ArrowDown,
  ArrowUp,
  Copy,
  FileJson,
  Image as ImageIcon,
  Layers,
  LayoutTemplate,
  Minus,
  Pencil,
  Redo2,
  Save,
  Shapes,
  Sparkles,
  Trash2,
  Type,
  Undo2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { Button, Input } from '@/components/ui';
import { DraggableItem } from '@/components/designer/DraggableItem';
import {
  sidebarInteractiveTileClass,
  sidebarInteractiveTileIconClass,
  sidebarInteractiveTileLabelClass,
  sidebarSectionLabelClass,
  sidebarTileGridClass,
  sidebarTileGroupClass,
} from '@/lib/swaggenSidebarStyles';
import { widgetElementsFromSwaggenDoc } from '@/lib/swaggenWidgetBridge';
import {
  createImageElement,
  createShapeElement,
  createTextElement,
} from '@/lib/swaggenElements';
import { ARTBOARD_PRESETS } from '@/lib/swaggenPresets';
import type { SwaggenArtboardPreset, SwaggenDocument, SwaggenElement } from '@/types/swaggenCanvas';
import type { Entity, UIComponentTemplate } from '@/types/project';

import { SwaggenArtboard } from './SwaggenArtboard';
import { SwaggenLayerDataPanel } from './SwaggenLayerDataPanel';
import { SwaggenTemplatePanel } from './SwaggenTemplatePanel';

const LEFT_RAIL_WIDTH_KEY = 'swaggen.editor.leftRailWidthPx';
const LEFT_RAIL_MIN = 220;
const LEFT_RAIL_MAX = 560;
const LEFT_RAIL_DEFAULT = 320;

function clampLeftRail(px: number): number {
  return Math.min(LEFT_RAIL_MAX, Math.max(LEFT_RAIL_MIN, Math.round(px)));
}

/** Older localStorage key segment (pre–Swaggen public name). */
const LEFT_RAIL_WIDTH_KEY_LEGACY =
  'swaggen.' + ['c', 'a', 'n', 'v', 'y'].join('') + '.leftRailWidthPx';

function readStoredLeftRail(): number {
  if (typeof window === 'undefined') return LEFT_RAIL_DEFAULT;
  const readKey = (key: string): number | null => {
    const raw = localStorage.getItem(key);
    const n = raw ? parseInt(raw, 10) : NaN;
    return Number.isNaN(n) ? null : clampLeftRail(n);
  };
  return (
    readKey(LEFT_RAIL_WIDTH_KEY) ??
    readKey(LEFT_RAIL_WIDTH_KEY_LEGACY) ??
    LEFT_RAIL_DEFAULT
  );
}

const BG_PRESETS = [
  { label: 'White', value: '#ffffff' },
  { label: 'Soft gray', value: '#f4f4f5' },
  { label: 'Ink', value: '#18181b' },
  {
    label: 'Aurora',
    value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  {
    label: 'Sunset',
    value: 'linear-gradient(120deg, #f093fb 0%, #f5576c 100%)',
  },
  {
    label: 'Ocean',
    value: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  },
];

export interface SwaggenEditorLayoutProps {
  doc: SwaggenDocument;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  zoom: number;
  onZoomChange: (z: number) => void;
  onRename: (name: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onExportJson?: () => void;
  /** When false, page name is edited only in the parent (e.g. Pages screen) */
  showDesignNameInput?: boolean;
  applyPreset: (preset: SwaggenArtboardPreset) => void;
  applyRichTemplate: (templateId: string) => void;
  addElement: (el: SwaggenElement) => void;
  updateElement: (id: string, patch: Partial<SwaggenElement>) => void;
  updateElementLive: (id: string, patch: Partial<SwaggenElement>) => void;
  removeElement: (id: string) => void;
  duplicateElement: (id: string) => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  setBackground: (bg: string) => void;
  onBeginInteraction: () => void;
  artboardRef: React.RefObject<HTMLDivElement | null>;
  /** e.g. full viewport height vs embedded in Pages */
  shellClassName?: string;
  onKeyboardUndoRedoDuplicateDelete?: boolean;
  /** When true, the artboard viewport is a dnd-kit drop target for UI templates (Pages editor) */
  interactiveDropZone?: boolean;
  /** Rendered above canvas layers in artboard coordinates (e.g. free-form UI components) */
  artboardOverlay?: ReactNode;
  /** Extra controls in the left sidebar (e.g. entity / field palette) */
  leftSidebarExtra?: ReactNode;
  /** When set, layers panel shows entity & widget binding controls */
  entities?: Entity[];
  enableBindingDnd?: boolean;
  /** Draggable widget templates (Pages editor) */
  widgetTemplateCatalog?: {
    value: UIComponentTemplate;
    label: string;
    group?: string;
  }[];
  /** Bind entity field samples to page runtime in the layer panel (Pages edit mode) */
  interactiveFieldPreview?: boolean;
  /** e.g. persist page + preview field values (Pages editor) */
  onSaveContent?: () => void;
  saveContentLabel?: string;
  saveContentDisabled?: boolean;
  onSaveAndClose?: () => void;
  saveAndCloseLabel?: string;
  onFieldNameClick?: (
    entityId: string,
    fieldName: string,
    fieldType: string,
  ) => void;
}

export function SwaggenEditorLayout({
  doc,
  selectedId,
  onSelect,
  zoom,
  onZoomChange,
  onRename,
  onUndo,
  onRedo,
  onExportJson,
  showDesignNameInput = true,
  applyPreset,
  applyRichTemplate,
  addElement,
  updateElement,
  updateElementLive,
  removeElement,
  duplicateElement,
  bringForward,
  sendBackward,
  setBackground,
  onBeginInteraction,
  artboardRef,
  shellClassName = 'h-[calc(100vh-3.5rem)]',
  onKeyboardUndoRedoDuplicateDelete = true,
  interactiveDropZone = false,
  artboardOverlay,
  leftSidebarExtra,
  entities: entitiesProp,
  enableBindingDnd = false,
  widgetTemplateCatalog,
  interactiveFieldPreview = false,
  onSaveContent,
  saveContentLabel,
  saveContentDisabled = false,
  onSaveAndClose,
  saveAndCloseLabel,
  onFieldNameClick,
}: SwaggenEditorLayoutProps) {
  const { setNodeRef: setDropZoneRef } = useDroppable({
    id: 'canvas-droppable',
    data: { type: 'canvas-drop-zone' },
    disabled: !interactiveDropZone,
  });

  const [imageUrlDraft, setImageUrlDraft] = useState(
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80',
  );

  const [leftRailWidth, setLeftRailWidth] = useState(LEFT_RAIL_DEFAULT);
  const leftRailDrag = useRef<{ startX: number; startW: number } | null>(
    null,
  );
  const leftRailWidthRef = useRef(LEFT_RAIL_DEFAULT);

  useEffect(() => {
    const w = readStoredLeftRail();
    leftRailWidthRef.current = w;
    setLeftRailWidth(w);
  }, []);

  useEffect(() => {
    leftRailWidthRef.current = leftRailWidth;
  }, [leftRailWidth]);

  const onLeftRailPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      leftRailDrag.current = {
        startX: e.clientX,
        startW: leftRailWidthRef.current,
      };
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [],
  );

  const onLeftRailPointerMove = useCallback((e: React.PointerEvent) => {
    if (!leftRailDrag.current) return;
    const dx = e.clientX - leftRailDrag.current.startX;
    setLeftRailWidth(
      clampLeftRail(leftRailDrag.current.startW + dx),
    );
  }, []);

  const finishLeftRailPointer = useCallback((e: React.PointerEvent) => {
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    if (leftRailDrag.current) {
      localStorage.setItem(
        LEFT_RAIL_WIDTH_KEY,
        String(leftRailWidthRef.current),
      );
      leftRailDrag.current = null;
    }
  }, []);

  const selected = useMemo(
    () => doc.elements.find(e => e.id === selectedId),
    [doc.elements, selectedId],
  );

  const siblingUi = useMemo(
    () => widgetElementsFromSwaggenDoc(doc.elements),
    [doc.elements],
  );

  const layerSettingsPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    let innerRaf = 0;
    const outerRaf = requestAnimationFrame(() => {
      innerRaf = requestAnimationFrame(() => {
        if (cancelled) return;
        const panel = layerSettingsPanelRef.current;
        if (!panel) return;
        panel.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'nearest',
        });
        const ta = panel.querySelector<HTMLTextAreaElement>('textarea');
        const textInput = panel.querySelector<HTMLInputElement>(
          'input:not([type="hidden"]):not([type="color"]):not([type="range"])',
        );
        const sel = panel.querySelector<HTMLSelectElement>('select');
        (ta ?? textInput ?? sel)?.focus({ preventScroll: true });
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(outerRaf);
      cancelAnimationFrame(innerRaf);
    };
  }, [selectedId]);

  const widgetGroups = useMemo(() => {
    if (!widgetTemplateCatalog?.length) return null;
    return widgetTemplateCatalog.reduce(
      (acc, tpl) => {
        const g = tpl.group || 'Widgets';
        if (!acc[g]) acc[g] = [];
        acc[g].push(tpl);
        return acc;
      },
      {} as Record<string, typeof widgetTemplateCatalog>,
    );
  }, [widgetTemplateCatalog]);

  useEffect(() => {
    if (!onKeyboardUndoRedoDuplicateDelete) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) onRedo();
        else onUndo();
        return;
      }
      if (meta && e.key.toLowerCase() === 'd' && selectedId) {
        e.preventDefault();
        duplicateElement(selectedId);
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        const t = e.target as HTMLElement;
        if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return;
        e.preventDefault();
        removeElement(selectedId);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    onKeyboardUndoRedoDuplicateDelete,
    onUndo,
    onRedo,
    duplicateElement,
    removeElement,
    selectedId,
  ]);

  const w = doc.artboardWidth * zoom;
  const h = doc.artboardHeight * zoom;

  return (
    <div
      className={`flex min-h-0 flex-col bg-zinc-100 dark:bg-zinc-950 ${shellClassName}`}
    >
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-zinc-200 bg-white px-4 py-2 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-2 pr-3 border-r border-zinc-200 dark:border-zinc-700">
          <Sparkles className="text-zinc-500 dark:text-zinc-400" size={18} />
          <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
            Swaggen
          </span>
        </div>
        {showDesignNameInput && (
          <input
            className="h-8 w-48 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
            value={doc.name}
            onChange={e => onRename(e.target.value)}
            aria-label="Design name"
          />
        )}
        <Button
          type="button"
          variant="secondary"
          className="h-8 gap-1 text-xs"
          onClick={onUndo}
        >
          <Undo2 size={14} /> Undo
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="h-8 gap-1 text-xs"
          onClick={onRedo}
        >
          <Redo2 size={14} /> Redo
        </Button>
        {onSaveContent && (
          <Button
            type="button"
            className="h-8 gap-1 text-xs"
            onClick={onSaveContent}
            disabled={saveContentDisabled}
            title="Save UI changes to the project without leaving the editor"
          >
            <Save size={14} />
            {saveContentLabel ?? 'Save'}
          </Button>
        )}
        {onSaveAndClose && (
          <Button
            type="button"
            variant="secondary"
            className="h-8 gap-1 text-xs"
            onClick={onSaveAndClose}
            disabled={saveContentDisabled}
            title="Save and return to the page list"
          >
            <Save size={14} />
            {saveAndCloseLabel ?? 'Save & close'}
          </Button>
        )}
        <div className="flex items-center gap-1 border-l border-zinc-200 pl-2 dark:border-zinc-700">
          <Button
            type="button"
            variant="secondary"
            className="h-8 px-2"
            onClick={() => onZoomChange(zoom / 1.15)}
            aria-label="Zoom out"
          >
            <ZoomOut size={16} />
          </Button>
          <span className="min-w-[3rem] text-center text-xs tabular-nums text-zinc-500">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            type="button"
            variant="secondary"
            className="h-8 px-2"
            onClick={() => onZoomChange(zoom * 1.15)}
            aria-label="Zoom in"
          >
            <ZoomIn size={16} />
          </Button>
        </div>
        {onExportJson && (
          <Button
            type="button"
            className="h-8 gap-1 text-xs ml-auto"
            onClick={onExportJson}
            title="Download Swaggen site export JSON (swaggen-site/v1 schema)"
          >
            <FileJson size={14} />
            Export site JSON
          </Button>
        )}
      </div>

      <div className="flex min-h-0 flex-1">
        <aside
          className="shrink-0 overflow-y-auto border-r border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
          style={{ width: leftRailWidth, minWidth: LEFT_RAIL_MIN, maxWidth: LEFT_RAIL_MAX }}
        >
          <p className={sidebarSectionLabelClass}>
            <LayoutTemplate size={12} /> Size
          </p>
          <div className="flex flex-col gap-1 mb-4">
            {ARTBOARD_PRESETS.map(p => (
              <button
                key={p.id}
                type="button"
                className="rounded-lg border border-zinc-200 px-2 py-1.5 text-left text-xs transition hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                onClick={() => applyPreset(p)}
              >
                <span className="font-medium text-zinc-800 dark:text-zinc-100">
                  {p.name}
                </span>
                <span className="block text-[10px] text-zinc-400">
                  {p.width}×{p.height}
                </span>
              </button>
            ))}
          </div>

          <SwaggenTemplatePanel onApply={applyRichTemplate} />

          <p className={sidebarSectionLabelClass}>
            <Shapes size={12} /> Elements
          </p>
          <div className={sidebarTileGroupClass}>
            <div className={sidebarTileGridClass}>
              <button
                type="button"
                className={sidebarInteractiveTileClass}
                onClick={() =>
                  addElement(
                    createTextElement(doc.artboardWidth, doc.artboardHeight),
                  )
                }
              >
                <Type
                  size={16}
                  className={sidebarInteractiveTileIconClass}
                  strokeWidth={2}
                />
                <span className={sidebarInteractiveTileLabelClass}>Text</span>
              </button>
              <button
                type="button"
                className={sidebarInteractiveTileClass}
                onClick={() =>
                  addElement(
                    createShapeElement(
                      doc.artboardWidth,
                      doc.artboardHeight,
                      'rect',
                    ),
                  )
                }
              >
                <Shapes
                  size={16}
                  className={sidebarInteractiveTileIconClass}
                  strokeWidth={2}
                />
                <span className={sidebarInteractiveTileLabelClass}>
                  Rectangle
                </span>
              </button>
              <button
                type="button"
                className={sidebarInteractiveTileClass}
                onClick={() =>
                  addElement(
                    createShapeElement(
                      doc.artboardWidth,
                      doc.artboardHeight,
                      'ellipse',
                    ),
                  )
                }
              >
                <Shapes
                  size={16}
                  className={sidebarInteractiveTileIconClass}
                  strokeWidth={2}
                />
                <span className={sidebarInteractiveTileLabelClass}>
                  Ellipse
                </span>
              </button>
              <button
                type="button"
                className={sidebarInteractiveTileClass}
                onClick={() =>
                  addElement(
                    createShapeElement(
                      doc.artboardWidth,
                      doc.artboardHeight,
                      'line',
                    ),
                  )
                }
              >
                <Minus
                  size={16}
                  className={sidebarInteractiveTileIconClass}
                  strokeWidth={2}
                />
                <span className={sidebarInteractiveTileLabelClass}>Line</span>
              </button>
              <button
                type="button"
                className={`${sidebarInteractiveTileClass} col-span-2 min-h-0 flex-row gap-2 py-2.5`}
                onClick={() =>
                  addElement(
                    createImageElement(
                      doc.artboardWidth,
                      doc.artboardHeight,
                      imageUrlDraft.trim() || 'https://placehold.co/600x400',
                    ),
                  )
                }
              >
                <ImageIcon
                  size={16}
                  className={sidebarInteractiveTileIconClass}
                  strokeWidth={2}
                />
                <span className={sidebarInteractiveTileLabelClass}>
                  Add image
                </span>
              </button>
            </div>
            <div className="mt-2 space-y-1 border-t border-zinc-200/80 pt-2 dark:border-zinc-700/80">
              <label className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                Image URL
              </label>
              <Input
                className="h-8 text-xs"
                value={imageUrlDraft}
                onChange={e => setImageUrlDraft(e.target.value)}
                placeholder="https://…"
              />
            </div>
          </div>

          {widgetGroups &&
            Object.entries(widgetGroups).map(([group, tpls]) => (
              <div key={group} className="mt-4 space-y-2">
                <p className={sidebarSectionLabelClass}>
                  <LayoutTemplate size={12} /> {group}
                </p>
                <div className={sidebarTileGroupClass}>
                  <div className={sidebarTileGridClass}>
                    {tpls.map(tpl => (
                      <DraggableItem
                        key={tpl.value}
                        id={`template-${tpl.value}`}
                        type="template"
                        data={{ template: tpl.value, label: tpl.label }}
                      >
                        <div className={sidebarInteractiveTileClass}>
                          <span className={sidebarInteractiveTileLabelClass}>
                            {tpl.label}
                          </span>
                        </div>
                      </DraggableItem>
                    ))}
                  </div>
                </div>
              </div>
            ))}

          <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <p className={sidebarSectionLabelClass}>
              <Layers size={12} /> Layers
            </p>
            <ul className="mb-4 space-y-1">
              {[...doc.elements]
                .sort((a, b) => b.zIndex - a.zIndex)
                .map(el => (
                  <li key={el.id}>
                    <button
                      type="button"
                      className={`flex w-full min-w-0 items-center justify-between rounded-lg border px-2.5 py-2 text-left text-xs transition-colors ${
                        selectedId === el.id
                          ? 'border-zinc-300 bg-zinc-100 font-semibold text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100'
                          : 'border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800'
                      }`}
                      onClick={() => onSelect(el.id)}
                    >
                      <span className="truncate font-medium">{el.name}</span>
                      <span className="shrink-0 text-[10px] text-zinc-400">
                        {el.kind}
                      </span>
                    </button>
                  </li>
                ))}
              {doc.elements.length === 0 && (
                <li className="text-xs text-zinc-400">No layers yet</li>
              )}
            </ul>

            {selected && (
              <div
                ref={layerSettingsPanelRef}
                className="space-y-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-950/80"
              >
                <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 pb-2.5 dark:border-zinc-700">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-700 text-white shadow-sm dark:bg-zinc-600">
                    <Pencil size={16} strokeWidth={2.25} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Selected layer
                    </p>
                    <p className="truncate text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      {selected.name}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                    {selected.kind}
                  </span>
                </div>
                <p className="text-xs font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
                  Arrange
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-8 flex-1 gap-1 text-xs"
                    onClick={() => bringForward(selected.id)}
                  >
                    <ArrowUp size={14} /> Up
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-8 flex-1 gap-1 text-xs"
                    onClick={() => sendBackward(selected.id)}
                  >
                    <ArrowDown size={14} /> Down
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-8 flex-1 gap-1 text-xs"
                    onClick={() => duplicateElement(selected.id)}
                  >
                    <Copy size={14} /> Duplicate
                  </Button>
                  {!selected.locked && (
                    <Button
                      type="button"
                      variant="danger"
                      className="h-8 flex-1 gap-1 text-xs"
                      onClick={() => removeElement(selected.id)}
                    >
                      <Trash2 size={14} strokeWidth={2.25} /> Delete
                    </Button>
                  )}
                </div>

                {entitiesProp !== undefined && (
                  <SwaggenLayerDataPanel
                    selected={selected}
                    entities={entitiesProp}
                    siblingUiComponents={siblingUi}
                    updateElement={updateElement}
                    interactiveFieldPreview={interactiveFieldPreview}
                    onFieldNameClick={onFieldNameClick}
                  />
                )}

                {selected.kind === 'text' && selected.text && (
                  <>
                    <p className="text-xs font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
                      Text
                    </p>
                    <label className="text-[10px] font-medium text-zinc-600 dark:text-zinc-400">
                      Content (edit tokens freely)
                    </label>
                    <textarea
                      className="w-full min-h-[88px] rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-900 shadow-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400/20 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-500"
                      value={selected.text.content}
                      onChange={e =>
                        updateElement(selected.id, {
                          text: { ...selected.text!, content: e.target.value },
                        })
                      }
                    />
                    <label className="text-[10px] text-zinc-500">Size</label>
                    <input
                      type="number"
                      className="w-full rounded border border-zinc-200 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950"
                      value={selected.text.fontSize}
                      min={8}
                      max={400}
                      onChange={e =>
                        updateElement(selected.id, {
                          text: {
                            ...selected.text!,
                            fontSize: Number(e.target.value) || 8,
                          },
                        })
                      }
                    />
                    <label className="text-[10px] text-zinc-500">Color</label>
                    <input
                      type="color"
                      value={
                        selected.text.color.startsWith('#')
                          ? selected.text.color
                          : '#000000'
                      }
                      className="h-8 w-full cursor-pointer rounded border border-zinc-200 dark:border-zinc-700"
                      onChange={e =>
                        updateElement(selected.id, {
                          text: { ...selected.text!, color: e.target.value },
                        })
                      }
                    />
                  </>
                )}

                <p className="text-xs font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
                  Page
                </p>
                <div className="flex flex-wrap gap-1">
                  {BG_PRESETS.map(b => (
                    <button
                      key={b.label}
                      type="button"
                      title={b.label}
                      className="h-8 w-8 rounded-md border border-zinc-200 shadow-sm dark:border-zinc-600"
                      style={{ background: b.value }}
                      onClick={() => setBackground(b.value)}
                    />
                  ))}
                </div>

                <p className="text-xs font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
                  Selection
                </p>
                <label className="text-[10px] text-zinc-500">Opacity</label>
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={selected.opacity}
                  className="w-full"
                  onChange={e =>
                    updateElement(selected.id, {
                      opacity: Number(e.target.value),
                    })
                  }
                />
                <label className="text-[10px] text-zinc-500">Rotation (°)</label>
                <input
                  type="range"
                  min={-180}
                  max={180}
                  value={selected.rotation}
                  className="w-full"
                  onChange={e =>
                    updateElement(selected.id, {
                      rotation: Number(e.target.value),
                    })
                  }
                />

                {selected.kind === 'shape' && selected.shape && (
                  <>
                    <label className="text-[10px] text-zinc-500">Fill</label>
                    <input
                      type="color"
                      value={
                        selected.shape.fill.startsWith('#')
                          ? selected.shape.fill
                          : '#6366f1'
                      }
                      className="h-8 w-full cursor-pointer rounded border border-zinc-200 dark:border-zinc-700"
                      onChange={e =>
                        updateElement(selected.id, {
                          shape: { ...selected.shape!, fill: e.target.value },
                        })
                      }
                    />
                    <label className="text-[10px] text-zinc-500">Stroke</label>
                    <input
                      type="color"
                      value={
                        selected.shape.stroke.startsWith('#')
                          ? selected.shape.stroke
                          : '#64748b'
                      }
                      className="h-8 w-full cursor-pointer rounded border border-zinc-200 dark:border-zinc-700"
                      onChange={e =>
                        updateElement(selected.id, {
                          shape: { ...selected.shape!, stroke: e.target.value },
                        })
                      }
                    />
                  </>
                )}

                {selected.kind === 'image' && selected.image && (
                  <>
                    <label className="text-[10px] text-zinc-500">Image URL</label>
                    <Input
                      className="h-8 text-xs"
                      value={selected.image.src}
                      onChange={e =>
                        updateElement(selected.id, {
                          image: { ...selected.image!, src: e.target.value },
                        })
                      }
                    />
                    <label className="text-[10px] text-zinc-500">Fit</label>
                    <select
                      className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-950"
                      value={selected.image.objectFit}
                      onChange={e =>
                        updateElement(selected.id, {
                          image: {
                            ...selected.image!,
                            objectFit: e.target.value as
                              | 'cover'
                              | 'contain'
                              | 'fill',
                          },
                        })
                      }
                    >
                      <option value="cover">cover</option>
                      <option value="contain">contain</option>
                      <option value="fill">fill</option>
                    </select>
                  </>
                )}
              </div>
            )}
          </div>

          {leftSidebarExtra && (
            <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
              <p className={sidebarSectionLabelClass}>
                <LayoutTemplate size={12} /> Interactive &amp; data
              </p>
              <div className="min-w-0">{leftSidebarExtra}</div>
            </div>
          )}
        </aside>

        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize left panel"
          title="Drag to resize"
          className="group relative z-10 w-2 shrink-0 cursor-col-resize touch-none select-none border-l border-r border-transparent bg-zinc-200/70 hover:bg-zinc-300/90 active:bg-zinc-400/80 dark:bg-zinc-700/90 dark:hover:bg-zinc-600 dark:active:bg-zinc-500"
          onPointerDown={onLeftRailPointerDown}
          onPointerMove={onLeftRailPointerMove}
          onPointerUp={finishLeftRailPointer}
          onPointerCancel={finishLeftRailPointer}
        >
          <span className="pointer-events-none absolute left-1/2 top-1/2 h-8 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-400/90 opacity-0 transition-opacity group-hover:opacity-100 dark:bg-zinc-300/80" />
        </div>

        <div className="min-w-0 flex-1 overflow-auto bg-[length:20px_20px] bg-[linear-gradient(to_right,#e4e4e7_1px,transparent_1px),linear-gradient(to_bottom,#e4e4e7_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#27272a_1px,transparent_1px),linear-gradient(to_bottom,#27272a_1px,transparent_1px)] p-8">
          <div
            ref={interactiveDropZone ? setDropZoneRef : undefined}
            id={interactiveDropZone ? 'designer-canvas' : undefined}
            className="relative mx-auto"
            style={{ width: w, height: h }}
          >
            <div
              className="origin-top-left relative"
              style={{
                transform: `scale(${zoom})`,
                width: doc.artboardWidth,
                height: doc.artboardHeight,
              }}
            >
              <SwaggenArtboard
                doc={doc}
                zoom={zoom}
                selectedId={selectedId}
                onSelect={onSelect}
                onUpdateLive={(id, patch) => updateElementLive(id, patch)}
                onBeginInteraction={onBeginInteraction}
                artboardRef={artboardRef}
                entities={entitiesProp ?? []}
                enableBindingDnd={enableBindingDnd}
                onRemoveElement={removeElement}
              />
              {artboardOverlay ? (
                <div className="pointer-events-none absolute inset-0 z-[5]">
                  {artboardOverlay}
                </div>
              ) : null}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
