'use client';

import { useMemo } from 'react';

import { widgetElementsFromSwaggenDoc } from '@/lib/swaggenWidgetBridge';
import type { SwaggenDocument, SwaggenElement } from '@/types/swaggenCanvas';
import type { Entity } from '@/types/project';

import { SwaggenElementView } from './SwaggenElementView';

interface SwaggenArtboardProps {
  doc: SwaggenDocument;
  zoom: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdateLive: (id: string, patch: Partial<SwaggenElement>) => void;
  onBeginInteraction: () => void;
  artboardRef: React.RefObject<HTMLDivElement | null>;
  entities?: Entity[];
  enableBindingDnd?: boolean;
  onRemoveElement?: (id: string) => void;
}

export function SwaggenArtboard({
  doc,
  zoom,
  selectedId,
  onSelect,
  onUpdateLive,
  onBeginInteraction,
  artboardRef,
  entities = [],
  enableBindingDnd = false,
  onRemoveElement,
}: SwaggenArtboardProps) {
  const sorted = useMemo(
    () => [...doc.elements].sort((a, b) => a.zIndex - b.zIndex),
    [doc.elements],
  );

  const siblingUi = useMemo(
    () => widgetElementsFromSwaggenDoc(doc.elements),
    [doc.elements],
  );

  return (
    <div
      className="relative inline-block shadow-2xl ring-1 ring-zinc-200/80 dark:ring-zinc-700"
      style={{
        width: doc.artboardWidth,
        height: doc.artboardHeight,
        background: doc.background,
      }}
      ref={artboardRef}
      id="swaggen-artboard"
      onPointerDown={e => {
        if (e.target === e.currentTarget) onSelect(null);
      }}
    >
      {sorted.map(el => (
        <SwaggenElementView
          key={el.id}
          element={el}
          zoom={zoom}
          selected={selectedId === el.id}
          onSelect={() => onSelect(el.id)}
          onUpdateLive={patch => onUpdateLive(el.id, patch)}
          onCommitDrag={() => {}}
          onBeginInteraction={onBeginInteraction}
          entities={entities}
          siblingUiComponents={siblingUi}
          enableBindingDnd={enableBindingDnd}
          onRemove={onRemoveElement}
        />
      ))}
    </div>
  );
}
