'use client';

import {
  useRef,
  useCallback,
  useImperativeHandle,
  forwardRef,
  type ReactNode,
} from 'react';

import { downloadSwaggenSiteJson } from '@/lib/swaggenSiteExport';
import { createWidgetElement } from '@/lib/swaggenElements';
import type { SwaggenDocument } from '@/types/swaggenCanvas';
import type { Entity, UIComponentTemplate } from '@/types/project';

import { SwaggenEditorLayout } from './SwaggenEditorLayout';
import { useSwaggenEditor } from './useSwaggenEditor';

export type SwaggenEmbeddedEditorHandle = {
  addWidgetTemplate: (template: UIComponentTemplate, label: string) => void;
  addWidgetTemplateAt: (
    template: UIComponentTemplate,
    label: string,
    x: number,
    y: number,
  ) => void;
  /** Insert field token / binding into the selected text or widget layer */
  insertFieldIntoSelection: (
    entityId: string,
    fieldName: string,
    fieldType: string,
  ) => boolean;
  /** Remove a layer from the artboard (same as Delete in the layer list). */
  removeLayer: (elementId: string) => void;
};

interface SwaggenEmbeddedEditorProps {
  document: SwaggenDocument;
  onChange: (next: SwaggenDocument) => void;
  projectId?: string;
  /** Override artboard shell height when the editor shares the page with other panels */
  shellClassName?: string;
  /** Enable dnd-kit canvas drop + binding targets (Pages editor) */
  interactiveDropZone?: boolean;
  artboardOverlay?: ReactNode;
  leftSidebarExtra?: ReactNode;
  entities?: Entity[];
  enableBindingDnd?: boolean;
  widgetTemplateCatalog?: {
    value: UIComponentTemplate;
    label: string;
    group?: string;
  }[];
  /** Bind field preview inputs to page runtime (use with PageRuntimeProvider on Pages) */
  interactiveFieldPreview?: boolean;
  onSaveContent?: () => void;
  saveContentLabel?: string;
  saveContentDisabled?: boolean;
  /** Optional second action (e.g. save and exit the editor). */
  onSaveAndClose?: () => void;
  saveAndCloseLabel?: string;
  onFieldNameClick?: (
    entityId: string,
    fieldName: string,
    fieldType: string,
  ) => void;
}

const DEFAULT_SHELL =
  'min-h-[calc(100vh-10rem)] max-h-[calc(100vh-5rem)]';

/** Swaggen visual editor embedded in Pages — state owned by the parent `UIPage` */
export const SwaggenEmbeddedEditor = forwardRef<
  SwaggenEmbeddedEditorHandle,
  SwaggenEmbeddedEditorProps
>(function SwaggenEmbeddedEditor(
  {
    document,
    onChange,
    projectId,
    shellClassName,
    interactiveDropZone = false,
    artboardOverlay,
    leftSidebarExtra,
    entities,
    enableBindingDnd = false,
    widgetTemplateCatalog,
    interactiveFieldPreview = false,
    onSaveContent,
    saveContentLabel,
    saveContentDisabled,
    onSaveAndClose,
    saveAndCloseLabel,
    onFieldNameClick,
  },
  ref,
) {
  const ed = useSwaggenEditor(document, onChange);
  const artboardRef = useRef<HTMLDivElement>(null);

  const addWidgetTemplate = useCallback(
    (template: UIComponentTemplate, label: string) => {
      const el = createWidgetElement(
        ed.doc.artboardWidth,
        ed.doc.artboardHeight,
        template,
        label,
      );
      ed.addElement(el);
    },
    [ed.doc.artboardWidth, ed.doc.artboardHeight, ed.addElement],
  );

  const addWidgetTemplateAt = useCallback(
    (template: UIComponentTemplate, label: string, x: number, y: number) => {
      const el = createWidgetElement(
        ed.doc.artboardWidth,
        ed.doc.artboardHeight,
        template,
        label,
        { x, y },
      );
      ed.addElement(el);
    },
    [ed.doc.artboardWidth, ed.doc.artboardHeight, ed.addElement],
  );

  const insertFieldIntoSelection = useCallback(
    (entityId: string, fieldName: string, fieldType: string) =>
      ed.insertFieldIntoSelectedLayer(entityId, fieldName, fieldType),
    [ed.insertFieldIntoSelectedLayer],
  );

  useImperativeHandle(
    ref,
    () => ({
      addWidgetTemplate,
      addWidgetTemplateAt,
      insertFieldIntoSelection,
      removeLayer: (elementId: string) => {
        ed.removeElement(elementId);
      },
    }),
    [
      addWidgetTemplate,
      addWidgetTemplateAt,
      insertFieldIntoSelection,
      ed.removeElement,
    ],
  );

  return (
    <SwaggenEditorLayout
      doc={ed.doc}
      selectedId={ed.selectedId}
      onSelect={ed.setSelectedId}
      zoom={ed.zoom}
      onZoomChange={ed.setZoom}
      onRename={ed.renameDocument}
      onUndo={ed.undo}
      onRedo={ed.redo}
      onExportJson={() => downloadSwaggenSiteJson(ed.doc, { projectId })}
      showDesignNameInput={false}
      applyPreset={ed.applyPreset}
      applyRichTemplate={ed.applyRichTemplate}
      addElement={ed.addElement}
      updateElement={ed.updateElement}
      updateElementLive={ed.updateElementLive}
      removeElement={ed.removeElement}
      duplicateElement={ed.duplicateElement}
      bringForward={ed.bringForward}
      sendBackward={ed.sendBackward}
      setBackground={ed.setBackground}
      onBeginInteraction={ed.onBeginInteraction}
      artboardRef={artboardRef}
      shellClassName={shellClassName ?? DEFAULT_SHELL}
      interactiveDropZone={interactiveDropZone}
      artboardOverlay={artboardOverlay}
      leftSidebarExtra={leftSidebarExtra}
      entities={entities}
      enableBindingDnd={enableBindingDnd}
      widgetTemplateCatalog={widgetTemplateCatalog}
      interactiveFieldPreview={interactiveFieldPreview}
      onSaveContent={onSaveContent}
      saveContentLabel={saveContentLabel}
      saveContentDisabled={saveContentDisabled}
      onSaveAndClose={onSaveAndClose}
      saveAndCloseLabel={saveAndCloseLabel}
      onFieldNameClick={onFieldNameClick}
    />
  );
});
