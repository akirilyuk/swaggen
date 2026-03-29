import { v4 as uuid } from 'uuid';

import type { SwaggenElement } from '@/types/swaggenCanvas';

export const SWAGGEN_DEFAULT_FONT =
  'var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif';

export function tplText(
  x: number,
  y: number,
  w: number,
  h: number,
  content: string,
  opts: {
    fontSize: number;
    fontWeight: number;
    color: string;
    textAlign?: 'left' | 'center' | 'right';
    lineHeight?: number;
  },
  z: number,
  name = 'Text',
): SwaggenElement {
  return {
    id: uuid(),
    kind: 'text',
    name,
    x,
    y,
    width: w,
    height: h,
    rotation: 0,
    opacity: 1,
    locked: false,
    zIndex: z,
    text: {
      content,
      fontFamily: SWAGGEN_DEFAULT_FONT,
      fontSize: opts.fontSize,
      fontWeight: opts.fontWeight,
      color: opts.color,
      textAlign: opts.textAlign ?? 'left',
      lineHeight: opts.lineHeight ?? 1.2,
    },
  };
}

export function tplRect(
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  stroke: string,
  radius: number,
  z: number,
  name = 'Rectangle',
): SwaggenElement {
  return {
    id: uuid(),
    kind: 'shape',
    name,
    x,
    y,
    width: w,
    height: h,
    rotation: 0,
    opacity: 1,
    locked: false,
    zIndex: z,
    shape: {
      kind: 'rect',
      fill,
      stroke,
      strokeWidth: stroke === 'transparent' ? 0 : 2,
      borderRadius: radius,
    },
  };
}

export function tplEllipse(
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  stroke: string,
  strokeWidth: number,
  z: number,
  name = 'Ellipse',
): SwaggenElement {
  return {
    id: uuid(),
    kind: 'shape',
    name,
    x,
    y,
    width: w,
    height: h,
    rotation: 0,
    opacity: 1,
    locked: false,
    zIndex: z,
    shape: {
      kind: 'ellipse',
      fill,
      stroke,
      strokeWidth,
      borderRadius: 0,
    },
  };
}

export function tplLine(
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  thickness: number,
  z: number,
): SwaggenElement {
  return {
    id: uuid(),
    kind: 'shape',
    name: 'Line',
    x,
    y,
    width: Math.max(w, 24),
    height: Math.max(h, thickness),
    rotation: 0,
    opacity: 1,
    locked: false,
    zIndex: z,
    shape: {
      kind: 'line',
      fill: 'transparent',
      stroke: color,
      strokeWidth: thickness,
      borderRadius: 0,
    },
  };
}

export function tplImage(
  x: number,
  y: number,
  w: number,
  h: number,
  src: string,
  objectFit: 'cover' | 'contain' | 'fill',
  z: number,
  name = 'Photo',
  objectPosition?: string,
): SwaggenElement {
  return {
    id: uuid(),
    kind: 'image',
    name,
    x,
    y,
    width: w,
    height: h,
    rotation: 0,
    opacity: 1,
    locked: false,
    zIndex: z,
    image: {
      src,
      objectFit,
      ...(objectPosition ? { objectPosition } : {}),
    },
  };
}

/** Reassign z-index 1..n in array order (render order). */
export function reindexZ(elements: SwaggenElement[]): SwaggenElement[] {
  return elements.map((e, i) => ({ ...e, zIndex: i + 1 }));
}
