/**
 * Swaggen visual canvas documents — page design (layers, text, shapes, widgets).
 * Persisted on `UIPage.swaggenDocument` when `editorMode === 'swaggen'`.
 */

export type SwaggenShapeKind = 'rect' | 'ellipse' | 'line';

export interface SwaggenShapeStyle {
  kind: SwaggenShapeKind;
  fill: string;
  stroke: string;
  strokeWidth: number;
  borderRadius: number;
}

export interface SwaggenTextStyle {
  content: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  textAlign: 'left' | 'center' | 'right';
  lineHeight: number;
}

export interface SwaggenImageStyle {
  src: string;
  objectFit: 'cover' | 'contain' | 'fill';
  /** CSS object-position (e.g. `center 30%`) for focal point when using cover */
  objectPosition?: string;
}

export type SwaggenElementKind = 'text' | 'shape' | 'image' | 'widget';

/** Entity / field binding on native layers (text `{field}` tokens, image URL field, etc.) */
export interface SwaggenElementDataBinding {
  entityId: string | null;
  visibleFields: string[];
}

/**
 * Interactive UI embedded in the artboard (buttons, inputs, data views…).
 * Geometry lives on `SwaggenElement`; `id` matches the element id at runtime.
 */
export interface SwaggenWidgetData {
  template: string;
  title: string;
  entityId: string | null;
  relationId: string | null;
  visibleFields: string[];
  linkedComponentIds?: string[];
  linkedSubmitButtonId?: string;
  submitAction?: Record<string, unknown>;
  props: Record<string, unknown>;
}

export interface SwaggenElement {
  id: string;
  kind: SwaggenElementKind;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  locked: boolean;
  zIndex: number;
  shape?: SwaggenShapeStyle;
  text?: SwaggenTextStyle;
  image?: SwaggenImageStyle;
  /** Text / image: bind to entity fields */
  dataBinding?: SwaggenElementDataBinding;
  /** kind === 'widget': full interactive component payload */
  widget?: SwaggenWidgetData;
}

export interface SwaggenArtboardPreset {
  id: string;
  name: string;
  width: number;
  height: number;
}

export interface SwaggenDocument {
  id: string;
  name: string;
  artboardWidth: number;
  artboardHeight: number;
  /** CSS background (solid, gradient, etc.) */
  background: string;
  elements: SwaggenElement[];
}
