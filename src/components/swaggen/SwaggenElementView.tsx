'use client';

import { useDroppable } from '@dnd-kit/core';
import { Trash2 } from 'lucide-react';
import { useRef, useCallback } from 'react';

import { SwaggenImageLayer } from '@/components/swaggen/SwaggenImageLayer';
import { canvasWidgetFrameClass } from '@/lib/swaggenSidebarStyles';
import { ComponentRenderer } from '@/components/designer/ComponentRenderer';
import { usePageRuntime } from '@/components/designer/PageRuntimeContext';
import { swaggenWidgetToUIComponent } from '@/lib/swaggenWidgetBridge';
import { resolveFieldForOutput } from '@/lib/entityFieldResolve';
import type { SwaggenElement } from '@/types/swaggenCanvas';
import type { Entity } from '@/types/project';

type Mode = 'move' | 'resize-br' | null;

interface SwaggenElementViewProps {
  element: SwaggenElement;
  zoom: number;
  selected: boolean;
  onSelect: () => void;
  onUpdateLive: (patch: Partial<SwaggenElement>) => void;
  onCommitDrag: () => void;
  onBeginInteraction: () => void;
  entities?: Entity[];
  siblingUiComponents?: import('@/types/project').UIComponent[];
  /** Enable entity/field drops onto this layer (Pages editor) */
  enableBindingDnd?: boolean;
  /** When set, shows a delete control for this layer (editor only). */
  onRemove?: (id: string) => void;
}

function TextLayerBody({
  el,
  entities,
}: {
  el: SwaggenElement;
  entities: Entity[];
}) {
  const { getValue } = usePageRuntime();
  if (!el.text) return null;
  let content = el.text.content;
  const db = el.dataBinding;
  if (db?.entityId) {
    const eid = db.entityId;
    content = content.replace(/\{([^}]+)\}/g, (_, raw) => {
      const field = raw.trim();
      const runtime = getValue(eid, field);
      const resolved = resolveFieldForOutput(entities, eid, field, runtime);
      return resolved !== '' ? resolved : `{${field}}`;
    });
  }
  const align = el.text.textAlign ?? 'left';
  return (
    <div
      className={`h-full w-full overflow-hidden whitespace-pre-wrap break-words p-4 ${
        align === 'center'
          ? 'flex items-center justify-center text-center'
          : ''
      }`}
      style={{
        fontFamily: el.text.fontFamily,
        fontSize: el.text.fontSize,
        fontWeight: el.text.fontWeight,
        color: el.text.color,
        textAlign: align,
        lineHeight: el.text.lineHeight,
      }}
    >
      {content}
    </div>
  );
}

export function SwaggenElementView({
  element: el,
  zoom,
  selected,
  onSelect,
  onUpdateLive,
  onCommitDrag,
  onBeginInteraction,
  entities = [],
  siblingUiComponents = [],
  enableBindingDnd = false,
  onRemove,
}: SwaggenElementViewProps) {
  const modeRef = useRef<Mode>(null);
  const startRef = useRef({ x: 0, y: 0, ex: 0, ey: 0, ew: 0, eh: 0 });

  const { setNodeRef: setBindRef, isOver: bindOver } = useDroppable({
    id: `swaggen-bind-${el.id}`,
    data: {
      type: 'swaggen-bind-target',
      elementId: el.id,
      elementKind: el.kind,
    },
    disabled: !enableBindingDnd,
  });

  const onPointerDownMove = useCallback(
    (e: React.PointerEvent) => {
      if (el.locked) return;
      e.stopPropagation();
      onSelect();
      onBeginInteraction();
      modeRef.current = 'move';
      startRef.current = {
        x: e.clientX,
        y: e.clientY,
        ex: el.x,
        ey: el.y,
        ew: el.width,
        eh: el.height,
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [el.locked, el.x, el.y, el.width, el.height, onSelect, onBeginInteraction],
  );

  const onPointerDownResize = useCallback(
    (e: React.PointerEvent) => {
      if (el.locked) return;
      e.stopPropagation();
      onSelect();
      onBeginInteraction();
      modeRef.current = 'resize-br';
      startRef.current = {
        x: e.clientX,
        y: e.clientY,
        ex: el.x,
        ey: el.y,
        ew: el.width,
        eh: el.height,
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [el.locked, el.x, el.y, el.width, el.height, onSelect, onBeginInteraction],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const mode = modeRef.current;
      if (!mode) return;
      const dx = (e.clientX - startRef.current.x) / zoom;
      const dy = (e.clientY - startRef.current.y) / zoom;
      if (mode === 'move') {
        onUpdateLive({
          x: startRef.current.ex + dx,
          y: startRef.current.ey + dy,
        });
      } else if (mode === 'resize-br') {
        const nw = Math.max(24, startRef.current.ew + dx);
        const nh = Math.max(24, startRef.current.eh + dy);
        onUpdateLive({ width: nw, height: nh });
      }
    },
    [zoom, onUpdateLive],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (modeRef.current) {
        modeRef.current = null;
        onCommitDrag();
      }
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    },
    [onCommitDrag],
  );

  const style: React.CSSProperties = {
    position: 'absolute',
    left: el.x,
    top: el.y,
    width: el.width,
    height: el.height,
    transform: `rotate(${el.rotation}deg)`,
    opacity: el.opacity,
    zIndex: el.zIndex,
    outline: 'none',
    boxSizing: 'border-box',
    ...(selected && !el.locked
      ? {
          boxShadow:
            '0 0 0 2px rgba(255,255,255,0.95), 0 0 0 5px rgba(124, 58, 237, 0.85), 0 16px 44px rgba(124, 58, 237, 0.35)',
        }
      : selected && el.locked
        ? {
            boxShadow: '0 0 0 2px rgba(255,255,255,0.85), 0 0 0 4px rgba(161, 161, 170, 0.9)',
          }
        : {}),
  };

  const uiComp =
    el.kind === 'widget' && el.widget
      ? swaggenWidgetToUIComponent(el)
      : null;

  const inner =
    el.kind === 'text' && el.text ? (
      <TextLayerBody el={el} entities={entities} />
    ) : el.kind === 'shape' && el.shape ? (
      el.shape.kind === 'ellipse' ? (
        <div
          className="h-full w-full"
          style={{
            borderRadius: '50%',
            background: el.shape.fill,
            border:
              el.shape.strokeWidth > 0
                ? `${el.shape.strokeWidth}px solid ${el.shape.stroke}`
                : undefined,
          }}
        />
      ) : el.shape.kind === 'line' ? (
        <div
          className="h-full w-full rounded-full"
          style={{
            background: el.shape.stroke,
            minHeight: el.shape.strokeWidth,
          }}
        />
      ) : (
        <div
          className="h-full w-full"
          style={{
            borderRadius: el.shape.borderRadius,
            background: el.shape.fill,
            border:
              el.shape.strokeWidth > 0
                ? `${el.shape.strokeWidth}px solid ${el.shape.stroke}`
                : undefined,
          }}
        />
      )
    ) : el.kind === 'image' && el.image ? (
      <SwaggenImageLayer el={el} />
    ) : uiComp ? (
      <div className="h-full w-full overflow-hidden rounded-lg bg-white/95 dark:bg-zinc-900/95">
        <ComponentRenderer
          component={uiComp}
          entities={entities}
          siblingComponents={siblingUiComponents}
        />
      </div>
    ) : null;

  const isWidget = el.kind === 'widget';
  const showDelete =
    selected && !el.locked && typeof onRemove === 'function';

  return (
    <div
      ref={setBindRef}
      style={style}
      className={`group ${
        bindOver && !selected
          ? 'ring-2 ring-amber-400 ring-offset-2'
          : ''
      } ${
        selected && !el.locked
          ? 'z-[2] ring-4 ring-violet-600 ring-offset-[5px] ring-offset-zinc-100 dark:ring-violet-400 dark:ring-offset-zinc-950'
          : selected && el.locked
            ? 'z-[1] ring-2 ring-dashed ring-zinc-400 ring-offset-2 ring-offset-zinc-100 dark:ring-zinc-500 dark:ring-offset-zinc-950'
            : ''
      }`}
      onPointerDown={e => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {isWidget ? (
        <div className={`relative ${canvasWidgetFrameClass}`}>
          <div
            className={`flex h-8 shrink-0 cursor-grab items-center gap-1 border-b px-2 text-[10px] font-semibold uppercase tracking-wide ${
              selected && !el.locked
                ? 'border-violet-300 bg-violet-100 text-violet-800 dark:border-violet-600 dark:bg-violet-950/80 dark:text-violet-200'
                : 'border-zinc-200 bg-zinc-50/95 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/95 dark:text-zinc-400'
            }`}
            onPointerDown={onPointerDownMove}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <span className="flex-1 select-none">Move</span>
            {showDelete && (
              <button
                type="button"
                aria-label="Delete layer"
                className="pointer-events-auto -mr-0.5 shrink-0 rounded p-1 text-red-600 hover:bg-red-100/90 dark:hover:bg-red-950/60"
                onPointerDown={e => e.stopPropagation()}
                onClick={e => {
                  e.stopPropagation();
                  onRemove?.(el.id);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={2.25} />
              </button>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-4">{inner}</div>
        </div>
      ) : (
        <div
          className="relative h-full w-full"
          onPointerDown={onPointerDownMove}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {inner}
        </div>
      )}
      {showDelete && !isWidget && (
        <button
          type="button"
          aria-label="Delete layer"
          className="pointer-events-auto absolute -right-1.5 -top-1.5 z-10 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border-2 border-red-200 bg-white shadow-md ring-2 ring-red-100 dark:border-red-500/70 dark:bg-zinc-900 dark:ring-red-950/80"
          onPointerDown={e => e.stopPropagation()}
          onClick={e => {
            e.stopPropagation();
            onRemove?.(el.id);
          }}
        >
          <Trash2 className="h-3 w-3 text-red-600" strokeWidth={2.25} />
        </button>
      )}
      {selected && !el.locked && (
        <button
          type="button"
          aria-label="Resize"
          className="pointer-events-auto absolute -right-1.5 -bottom-1.5 z-10 h-4 w-4 cursor-nwse-resize rounded-sm border-2 border-violet-600 bg-white shadow-md ring-2 ring-violet-200 dark:border-violet-400 dark:bg-zinc-900 dark:ring-violet-800"
          onPointerDown={onPointerDownResize}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      )}
    </div>
  );
}
