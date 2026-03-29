'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { v4 as uuid } from 'uuid';

import { mergeTemplateCoverPhotoIntoElements } from '@/lib/swaggenDocumentFactory';
import { ARTBOARD_PRESETS, createEmptyDocument } from '@/lib/swaggenPresets';
import { getSwaggenLayoutTemplate } from '@/lib/swaggenTemplatesRegistry';
import { applyFieldToSwaggenLayer } from '@/lib/swaggenWidgetBridge';
import { templatePreviewImageUrl } from '@/lib/templatePreviewAssets';
import type {
  SwaggenArtboardPreset,
  SwaggenDocument,
  SwaggenElement,
} from '@/types/swaggenCanvas';

const HISTORY_LIMIT = 40;

function cloneDoc(doc: SwaggenDocument): SwaggenDocument {
  return JSON.parse(JSON.stringify(doc)) as SwaggenDocument;
}

/**
 * Local Swaggen canvas document editor (undo/redo, templates) for embedding in Pages.
 * Local editor state only (not a global persisted store).
 */
export function useSwaggenEditor(
  document: SwaggenDocument,
  onChange: (next: SwaggenDocument) => void,
) {
  const docRef = useRef(document);
  docRef.current = document;

  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedId(cur => {
      if (!cur) return cur;
      return document.elements.some(e => e.id === cur) ? cur : null;
    });
  }, [document.elements]);
  /** Default zoom ~60% above the old 0.35 so new pages open with a larger artboard. */
  const [zoom, setZoom] = useState(0.56);
  const [past, setPast] = useState<SwaggenDocument[]>([]);
  const [future, setFuture] = useState<SwaggenDocument[]>([]);

  const commit = useCallback(
    (next: SwaggenDocument) => {
      onChange(next);
    },
    [onChange],
  );

  const snapshot = useCallback(() => {
    const cur = docRef.current;
    setPast(p => {
      const n = [...p, cloneDoc(cur)];
      if (n.length > HISTORY_LIMIT) n.shift();
      return n;
    });
    setFuture([]);
  }, []);

  const renameDocument = useCallback(
    (name: string) => {
      commit({ ...docRef.current, name });
    },
    [commit],
  );

  const applyPreset = useCallback(
    (preset: SwaggenArtboardPreset) => {
      snapshot();
      commit(
        createEmptyDocument(preset, docRef.current.name ?? 'Untitled design'),
      );
      setSelectedId(null);
    },
    [commit, snapshot],
  );

  const applyRichTemplate = useCallback(
    (templateId: string) => {
      const doc = docRef.current;
      if (templateId === 'blank') {
        snapshot();
        commit({
          ...doc,
          elements: [],
          background: '#ffffff',
        });
        setSelectedId(null);
        return;
      }
      const def = getSwaggenLayoutTemplate(templateId);
      if (!def) return;
      const preset =
        ARTBOARD_PRESETS.find(p => p.id === def.presetId) ?? ARTBOARD_PRESETS[0];
      snapshot();
      const { elements, background } = def.build(preset.width, preset.height);
      const merged = mergeTemplateCoverPhotoIntoElements(
        elements,
        preset.width,
        preset.height,
        templatePreviewImageUrl(templateId),
      );
      commit({
        ...doc,
        name: def.name,
        artboardWidth: preset.width,
        artboardHeight: preset.height,
        elements: merged,
        background: background ?? '#ffffff',
      });
      setSelectedId(null);
    },
    [commit, snapshot],
  );

  const setBackground = useCallback(
    (background: string) => {
      snapshot();
      commit({ ...docRef.current, background });
    },
    [commit, snapshot],
  );

  const addElement = useCallback(
    (el: SwaggenElement) => {
      const doc = docRef.current;
      snapshot();
      const maxZ = doc.elements.reduce((m, e) => Math.max(m, e.zIndex), 0);
      const next = { ...el, zIndex: maxZ + 1 };
      commit({ ...doc, elements: [...doc.elements, next] });
      setSelectedId(next.id);
    },
    [commit, snapshot],
  );

  const updateElement = useCallback(
    (id: string, patch: Partial<SwaggenElement>) => {
      const doc = docRef.current;
      const idx = doc.elements.findIndex(e => e.id === id);
      if (idx === -1) return;
      snapshot();
      const nextEls = [...doc.elements];
      nextEls[idx] = { ...nextEls[idx], ...patch };
      commit({ ...doc, elements: nextEls });
    },
    [commit, snapshot],
  );

  const updateElementLive = useCallback(
    (id: string, patch: Partial<SwaggenElement>) => {
      const doc = docRef.current;
      const idx = doc.elements.findIndex(e => e.id === id);
      if (idx === -1) return;
      const nextEls = [...doc.elements];
      nextEls[idx] = { ...nextEls[idx], ...patch };
      commit({ ...doc, elements: nextEls });
    },
    [commit],
  );

  const removeElement = useCallback(
    (id: string) => {
      snapshot();
      const doc = docRef.current;
      commit({
        ...doc,
        elements: doc.elements.filter(e => e.id !== id),
      });
      setSelectedId(s => (s === id ? null : s));
    },
    [commit, snapshot],
  );

  const duplicateElement = useCallback(
    (id: string) => {
      const doc = docRef.current;
      const el = doc.elements.find(e => e.id === id);
      if (!el) return;
      snapshot();
      const maxZ = doc.elements.reduce((m, e) => Math.max(m, e.zIndex), 0);
      const copy: SwaggenElement = {
        ...(JSON.parse(JSON.stringify(el)) as SwaggenElement),
        id: uuid(),
        name: `${el.name} copy`,
        x: el.x + 24,
        y: el.y + 24,
        zIndex: maxZ + 1,
      };
      commit({ ...doc, elements: [...doc.elements, copy] });
      setSelectedId(copy.id);
    },
    [commit, snapshot],
  );

  const bringForward = useCallback(
    (id: string) => {
      const doc = docRef.current;
      const sorted = [...doc.elements].sort((a, b) => a.zIndex - b.zIndex);
      const i = sorted.findIndex(e => e.id === id);
      if (i === -1 || i >= sorted.length - 1) return;
      snapshot();
      const a = sorted[i];
      const b = sorted[i + 1];
      const next = doc.elements.map(e => {
        if (e.id === a.id) return { ...e, zIndex: b.zIndex };
        if (e.id === b.id) return { ...e, zIndex: a.zIndex };
        return e;
      });
      commit({ ...doc, elements: next });
    },
    [commit, snapshot],
  );

  const sendBackward = useCallback(
    (id: string) => {
      const doc = docRef.current;
      const sorted = [...doc.elements].sort((a, b) => a.zIndex - b.zIndex);
      const i = sorted.findIndex(e => e.id === id);
      if (i <= 0) return;
      snapshot();
      const a = sorted[i - 1];
      const b = sorted[i];
      const next = doc.elements.map(e => {
        if (e.id === a.id) return { ...e, zIndex: b.zIndex };
        if (e.id === b.id) return { ...e, zIndex: a.zIndex };
        return e;
      });
      commit({ ...doc, elements: next });
    },
    [commit, snapshot],
  );

  const undo = useCallback(() => {
    setPast(p => {
      if (p.length === 0) return p;
      const prev = p[p.length - 1];
      const rest = p.slice(0, -1);
      setFuture(f => [...f, cloneDoc(docRef.current)]);
      commit(prev);
      setSelectedId(null);
      return rest;
    });
  }, [commit]);

  const redo = useCallback(() => {
    setFuture(f => {
      if (f.length === 0) return f;
      const next = f[f.length - 1];
      const rest = f.slice(0, -1);
      setPast(p => [...p, cloneDoc(docRef.current)]);
      commit(next);
      setSelectedId(null);
      return rest;
    });
  }, [commit]);

  const onBeginInteraction = useCallback(() => {
    snapshot();
  }, [snapshot]);

  /** Insert `{field}` / widget binding for the current selection (palette buttons). */
  const insertFieldIntoSelectedLayer = useCallback(
    (
      entityId: string,
      fieldName: string,
      fieldType: string,
    ): boolean => {
      const id = selectedId;
      if (!id) return false;
      const doc = docRef.current;
      const el = doc.elements.find(e => e.id === id);
      if (!el) return false;
      const next = applyFieldToSwaggenLayer(el, entityId, fieldName, fieldType);
      if (!next || next === el) return false;
      const patch: Partial<SwaggenElement> = {};
      if (next.text !== undefined) patch.text = next.text;
      if (next.dataBinding !== undefined) patch.dataBinding = next.dataBinding;
      if (next.widget !== undefined) patch.widget = next.widget;
      updateElement(id, patch);
      return true;
    },
    [selectedId, updateElement],
  );

  return {
    doc: document,
    selectedId,
    setSelectedId,
    zoom,
    setZoom,
    renameDocument,
    applyPreset,
    applyRichTemplate,
    setBackground,
    addElement,
    updateElement,
    updateElementLive,
    removeElement,
    duplicateElement,
    bringForward,
    sendBackward,
    undo,
    redo,
    onBeginInteraction,
    insertFieldIntoSelectedLayer,
  };
}
