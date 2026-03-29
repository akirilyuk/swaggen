import { v4 as uuid } from 'uuid';

import type { SwaggenElement, SwaggenShapeKind } from '@/types/swaggenCanvas';
import type { UIComponentTemplate } from '@/types/project';

function center(
  artW: number,
  artH: number,
  elW: number,
  elH: number,
): { x: number; y: number } {
  return { x: (artW - elW) / 2, y: (artH - elH) / 2 };
}

export function createTextElement(artW: number, artH: number): SwaggenElement {
  const w = Math.min(560, artW * 0.7);
  const h = 120;
  const { x, y } = center(artW, artH, w, h);
  return {
    id: uuid(),
    kind: 'text',
    name: 'Text',
    x,
    y,
    width: w,
    height: h,
    rotation: 0,
    opacity: 1,
    locked: false,
    zIndex: 0,
    text: {
      content: 'Double-click the sidebar or edit text here',
      fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
      fontSize: 32,
      fontWeight: 600,
      color: '#18181b',
      textAlign: 'left',
      lineHeight: 1.3,
    },
  };
}

export function createShapeElement(
  artW: number,
  artH: number,
  kind: SwaggenShapeKind,
): SwaggenElement {
  const w = Math.min(400, artW * 0.45);
  const h = kind === 'line' ? 8 : Math.min(280, artH * 0.35);
  const { x, y } = center(artW, artH, w, h);
  return {
    id: uuid(),
    kind: 'shape',
    name: kind === 'ellipse' ? 'Ellipse' : kind === 'line' ? 'Line' : 'Rectangle',
    x,
    y,
    width: w,
    height: h,
    rotation: 0,
    opacity: 1,
    locked: false,
    zIndex: 0,
    shape: {
      kind,
      fill:
        kind === 'line'
          ? 'transparent'
          : kind === 'ellipse'
            ? 'rgba(99, 102, 241, 0.35)'
            : 'rgba(14, 165, 233, 0.25)',
      stroke: kind === 'line' ? '#0ea5e9' : '#64748b',
      strokeWidth: kind === 'line' ? 6 : 2,
      borderRadius: kind === 'rect' ? 12 : 0,
    },
  };
}

export function createImageElement(
  artW: number,
  artH: number,
  src: string,
): SwaggenElement {
  const w = Math.min(480, artW * 0.55);
  const h = Math.min(360, artH * 0.45);
  const { x, y } = center(artW, artH, w, h);
  return {
    id: uuid(),
    kind: 'image',
    name: 'Image',
    x,
    y,
    width: w,
    height: h,
    rotation: 0,
    opacity: 1,
    locked: false,
    zIndex: 0,
    image: { src, objectFit: 'cover' },
  };
}

export function createWidgetElement(
  artW: number,
  artH: number,
  template: UIComponentTemplate,
  label: string,
  at?: { x: number; y: number },
): SwaggenElement {
  const w = Math.min(360, artW * 0.45);
  const h = 140;
  const { x, y } = at ?? center(artW, artH, w, h);
  return {
    id: uuid(),
    kind: 'widget',
    name: label,
    x,
    y,
    width: w,
    height: h,
    rotation: 0,
    opacity: 1,
    locked: false,
    zIndex: 0,
    widget: {
      template,
      title: label,
      entityId: null,
      relationId: null,
      visibleFields: [],
      props: {},
    },
  };
}
