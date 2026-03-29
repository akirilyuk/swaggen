'use client';

import { useMemo, type ReactNode } from 'react';

import { SwaggenImageLayer } from '@/components/swaggen/SwaggenImageLayer';
import { ComponentRenderer } from '@/components/designer/ComponentRenderer';
import { usePageRuntime } from '@/components/designer/PageRuntimeContext';
import { swaggenWidgetToUIComponent } from '@/lib/swaggenWidgetBridge';
import { resolveFieldForOutput } from '@/lib/entityFieldResolve';
import type { SwaggenDocument, SwaggenElement } from '@/types/swaggenCanvas';
import type { Entity, UIComponent } from '@/types/project';

function TextRead({ el, entities }: { el: SwaggenElement; entities: Entity[] }) {
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
    <div style={baseStyle(el)}>
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
    </div>
  );
}

function baseStyle(el: SwaggenElement): React.CSSProperties {
  return {
    position: 'absolute',
    left: el.x,
    top: el.y,
    width: el.width,
    height: el.height,
    transform: `rotate(${el.rotation}deg)`,
    opacity: el.opacity,
    zIndex: el.zIndex,
    boxSizing: 'border-box',
  };
}

function ElementRead({
  el,
  siblingUi,
  entities,
}: {
  el: SwaggenElement;
  siblingUi: UIComponent[];
  entities: Entity[];
}) {
  if (el.kind === 'text' && el.text) {
    return <TextRead el={el} entities={entities} />;
  }

  if (el.kind === 'shape' && el.shape) {
    const style = baseStyle(el);
    if (el.shape.kind === 'ellipse') {
      return (
        <div style={style}>
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
        </div>
      );
    }
    if (el.shape.kind === 'line') {
      return (
        <div style={style}>
          <div
            className="h-full w-full rounded-full"
            style={{
              background: el.shape.stroke,
              minHeight: el.shape.strokeWidth,
            }}
          />
        </div>
      );
    }
    return (
      <div style={style}>
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
      </div>
    );
  }

  if (el.kind === 'image' && el.image) {
    const style = baseStyle(el);
    return (
      <div style={style} className="relative">
        <SwaggenImageLayer el={el} />
      </div>
    );
  }

  if (el.kind === 'widget' && el.widget) {
    const comp = swaggenWidgetToUIComponent(el);
    if (!comp) return null;
    const style = baseStyle(el);
    return (
      <div style={style} className="box-border pointer-events-auto p-4">
        <ComponentRenderer
          component={comp}
          entities={entities}
          siblingComponents={siblingUi}
        />
      </div>
    );
  }

  return null;
}

/** Read-only Swaggen canvas for preview and public `/site/...` pages */
export function SwaggenPageRenderer({
  document: doc,
  interactiveOverlay,
  entities = [],
  scale = 1,
}: {
  document: SwaggenDocument;
  interactiveOverlay?: ReactNode;
  entities?: Entity[];
  /** 0–1: shrink canvas for preview panels (layout box matches visual size). */
  scale?: number;
}) {
  const sorted = useMemo(
    () => [...doc.elements].sort((a, b) => a.zIndex - b.zIndex),
    [doc.elements],
  );

  const siblingUi = useMemo(
    () =>
      sorted
        .filter(e => e.kind === 'widget' && e.widget)
        .map(e => swaggenWidgetToUIComponent(e)!),
    [sorted],
  );

  const w = doc.artboardWidth;
  const h = doc.artboardHeight;
  const s = Math.min(1, Math.max(0.05, scale));

  const inner = (
    <>
      {sorted.map(el => (
        <ElementRead
          key={el.id}
          el={el}
          siblingUi={siblingUi}
          entities={entities}
        />
      ))}
      {interactiveOverlay ? (
        <div className="pointer-events-none absolute inset-0 z-[1000]">
          {interactiveOverlay}
        </div>
      ) : null}
    </>
  );

  if (s >= 0.999) {
    return (
      <div
        className="relative mx-auto shadow-lg ring-1 ring-zinc-200/80 dark:ring-zinc-700"
        style={{
          width: w,
          minHeight: h,
          height: h,
          background: doc.background,
        }}
      >
        {inner}
      </div>
    );
  }

  return (
    <div
      className="relative mx-auto overflow-hidden shadow-lg ring-1 ring-zinc-200/80 dark:ring-zinc-700"
      style={{
        width: w * s,
        height: h * s,
      }}
    >
      <div
        className="relative"
        style={{
          width: w,
          height: h,
          background: doc.background,
          transform: `scale(${s})`,
          transformOrigin: 'top left',
        }}
      >
        {inner}
      </div>
    </div>
  );
}
