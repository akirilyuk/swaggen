/**
 * Builds a static SVG string for each template: purpose copy + layout + background.
 * `generate-template-previews` rasterizes with Resvg (system fonts on) → JPEG.
 */

import { ARTBOARD_PRESETS } from '@/lib/swaggenPresets';
import type { SwaggenLayoutTemplateDefinition } from '@/lib/swaggenTemplatesRegistry';
import type {
  SwaggenLayoutTemplatePreview,
  SwaggenLayoutTemplatePreviewLayout,
} from '@/lib/swaggenTemplatePreview';

const PRESET_FALLBACK = ARTBOARD_PRESETS[0];

function expandShortHex(h: string): string {
  if (h.length !== 4) return h;
  return `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`;
}

function normalizeColor(raw: string): string {
  const t = raw.trim();
  if (/^#[0-9a-fA-F]{3}$/i.test(t)) return expandShortHex(t);
  if (/^#[0-9a-fA-F]{6}$/i.test(t)) return t.toLowerCase();
  const rgb = t.match(
    /^rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i,
  );
  if (rgb) {
    const r = Math.min(255, +rgb[1]);
    const g = Math.min(255, +rgb[2]);
    const b = Math.min(255, +rgb[3]);
    return `#${[r, g, b]
      .map(x => x.toString(16).padStart(2, '0'))
      .join('')}`;
  }
  return '#6366f1';
}

function isSolidHex(bg: string): string | null {
  const t = bg.trim();
  if (/^#[0-9a-fA-F]{6}$/i.test(t)) return normalizeColor(t);
  if (/^#[0-9a-fA-F]{3}$/i.test(t)) return normalizeColor(t);
  return null;
}

interface ParsedGradient {
  angleDeg: number;
  stops: { offset: number; color: string }[];
}

function parseLinearGradient(bg: string): ParsedGradient | null {
  const m = bg.match(/linear-gradient\s*\(\s*(.*)\s*\)\s*$/i);
  if (!m) return null;
  let inner = m[1].trim();
  let angleDeg = 180;
  const degM = inner.match(/^([\d.-]+)deg\s*,\s*/i);
  if (degM) {
    angleDeg = parseFloat(degM[1]);
    inner = inner.slice(degM[0].length);
  }
  const stops: { offset: number; color: string }[] = [];
  const re =
    /(#[0-9a-fA-F]{3,8}|rgba?\s*\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[\d.]+\s*)?\))\s+([\d.]+)%/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(inner)) !== null) {
    stops.push({
      color: normalizeColor(match[1]),
      offset: Math.min(1, Math.max(0, parseFloat(match[2]) / 100)),
    });
  }
  if (stops.length === 0) {
    const hexes = inner.match(/#[0-9a-fA-F]{3,8}/gi);
    if (hexes?.length) {
      hexes.forEach((h, i) => {
        stops.push({
          color: normalizeColor(h),
          offset: i / Math.max(1, hexes.length - 1),
        });
      });
    }
  }
  if (stops.length === 0) return null;
  if (stops[0].offset > 0.001) {
    stops.unshift({ color: stops[0].color, offset: 0 });
  }
  const last = stops[stops.length - 1];
  if (last.offset < 0.999) {
    stops.push({ color: last.color, offset: 1 });
  }
  return { angleDeg, stops };
}

function gradientLineEndpoints(
  w: number,
  h: number,
  cssAngleDeg: number,
): { x1: number; y1: number; x2: number; y2: number } {
  const rad = ((90 - cssAngleDeg) * Math.PI) / 180;
  const L = Math.hypot(w, h) / 2;
  const cx = w / 2;
  const cy = h / 2;
  return {
    x1: cx - Math.cos(rad) * L,
    y1: cy - Math.sin(rad) * L,
    x2: cx + Math.cos(rad) * L,
    y2: cy + Math.sin(rad) * L,
  };
}

function backgroundDefs(
  bg: string,
  gradId: string,
  w: number,
  h: number,
): { defs: string; fillAttr: string } {
  const solid = isSolidHex(bg);
  if (solid) return { defs: '', fillAttr: `fill="${solid}"` };

  const parsed = parseLinearGradient(bg);
  if (parsed && parsed.stops.length >= 2) {
    const { x1, y1, x2, y2 } = gradientLineEndpoints(w, h, parsed.angleDeg);
    const stops = parsed.stops
      .map(
        s =>
          `<stop offset="${(s.offset * 100).toFixed(2)}%" stop-color="${s.color}"/>`,
      )
      .join('');
    return {
      defs: `<linearGradient id="${gradId}" gradientUnits="userSpaceOnUse" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}">${stops}</linearGradient>`,
      fillAttr: `fill="url(#${gradId})"`,
    };
  }

  const hexes = bg.match(/#[0-9a-fA-F]{3,8}/gi) ?? ['#6366f1', '#a855f7'];
  const c1 = normalizeColor(hexes[0]);
  const c2 = normalizeColor(hexes[1] ?? hexes[0]);
  return {
    defs: `<linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/></linearGradient>`,
    fillAttr: `fill="url(#${gradId})"`,
  };
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function truncate(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function fallbackThumb(name: string): { primary: string; secondary?: string } {
  const part = name.split('—')[1]?.trim();
  if (part) return { primary: truncate(part, 28) };
  return { primary: truncate(name, 32) };
}

/** Raster-style preview dimensions (bounded height for tall presets). */
export function previewDimensionsForPreset(presetId: string): {
  w: number;
  h: number;
} {
  const preset =
    ARTBOARD_PRESETS.find(p => p.id === presetId) ?? PRESET_FALLBACK;
  const aspect = preset.width / preset.height;
  let w = 800;
  let h = Math.round(w / aspect);
  const maxH = 960;
  if (h > maxH) {
    h = maxH;
    w = Math.round(h * aspect);
  }
  return { w, h };
}

function textColorForLayout(
  layout: SwaggenLayoutTemplatePreviewLayout,
  minimalOn: 'light' | 'dark' | undefined,
  bgIsDark: boolean,
): { primary: string; secondary: string } {
  if (layout === 'minimal' && minimalOn === 'dark') {
    return { primary: 'rgba(255,255,255,0.96)', secondary: 'rgba(255,255,255,0.82)' };
  }
  if (
    layout === 'kpiRow' ||
    layout === 'fullBleedPhoto' ||
    (layout === 'darkPanel' && bgIsDark) ||
    (layout === 'photoTop' && bgIsDark)
  ) {
    return { primary: 'rgba(255,255,255,0.96)', secondary: 'rgba(255,255,255,0.84)' };
  }
  if (layout === 'borderedDoc') {
    return { primary: 'rgba(92,42,12,0.98)', secondary: 'rgba(120,53,15,0.92)' };
  }
  if (bgIsDark) {
    return { primary: 'rgba(255,255,255,0.96)', secondary: 'rgba(255,255,255,0.82)' };
  }
  return { primary: 'rgba(24,24,27,0.96)', secondary: 'rgba(39,39,42,0.92)' };
}

function hexLuminance(hex: string): number {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function bgIsDarkish(bg: string): boolean {
  const solid = isSolidHex(bg);
  if (solid) return hexLuminance(solid) < 0.45;
  const parsed = parseLinearGradient(bg);
  if (parsed?.stops.length) {
    const mid = parsed.stops[Math.floor(parsed.stops.length / 2)]?.color;
    if (mid) return hexLuminance(mid) < 0.5;
  }
  const hexes = bg.match(/#[0-9a-fA-F]{3,8}/gi);
  if (hexes?.length) {
    return hexLuminance(normalizeColor(hexes[0])) < 0.42;
  }
  return false;
}

function thumbTextSvg(
  w: number,
  h: number,
  preview: SwaggenLayoutTemplatePreview,
  primary: string,
  secondary: string | undefined,
): string {
  const { layout, minimalOn } = preview;
  const dark = bgIsDarkish(preview.background);
  const { primary: fc, secondary: sc } = textColorForLayout(
    layout,
    minimalOn,
    dark,
  );

  const fs1 = Math.max(15, Math.round(w * 0.042));
  const fs2 = Math.max(11, Math.round(w * 0.028));
  let cx = w / 2;
  /** No nested `"` — breaks XML attribute parsing in Resvg */
  const font = 'Helvetica Neue, Arial, system-ui, sans-serif';

  let y1: number;
  let y2: number | null = null;

  switch (layout) {
    case 'photoTop':
      y1 = Math.round(h * 0.58);
      y2 = secondary ? Math.round(h * 0.68) : null;
      break;
    case 'pollStack':
      y1 = Math.round(h * 0.12);
      y2 = secondary ? Math.round(h * 0.2) : null;
      break;
    case 'splitLeft':
      cx = w * 0.68;
      y1 = Math.round(h * 0.42);
      y2 = secondary ? Math.round(h * 0.54) : null;
      break;
    case 'splitTopBar':
      y1 = Math.round(h * 0.42);
      y2 = secondary ? Math.round(h * 0.54) : null;
      break;
    case 'cardsRow':
    case 'kpiRow':
      y1 = Math.round(h * 0.1);
      y2 = secondary ? Math.round(h * 0.18) : null;
      break;
    case 'timeline':
      y1 = Math.round(h * 0.12);
      y2 = secondary ? Math.round(h * 0.2) : null;
      break;
    case 'borderedDoc':
      y1 = Math.round(h * 0.42);
      y2 = secondary ? Math.round(h * 0.52) : null;
      break;
    case 'darkPanel':
      y1 = Math.round(h * 0.38);
      y2 = secondary ? Math.round(h * 0.48) : null;
      break;
    case 'fullBleedPhoto':
      y1 = Math.round(h * 0.72);
      y2 = secondary ? Math.round(h * 0.82) : null;
      break;
    case 'minimal':
      y1 = Math.round(h * 0.34);
      y2 = secondary ? Math.round(h * 0.45) : null;
      break;
    case 'gradient':
    default:
      y1 = Math.round(h * 0.4);
      y2 = secondary ? Math.round(h * 0.52) : null;
  }

  const lines: string[] = [
    `<text x="${cx}" y="${y1}" text-anchor="middle" font-family="${font}" font-size="${fs1}" font-weight="700" fill="${fc}">${esc(primary)}</text>`,
  ];
  if (secondary && y2 !== null) {
    lines.push(
      `<text x="${cx}" y="${y2}" text-anchor="middle" font-family="${font}" font-size="${fs2}" font-weight="500" fill="${sc}">${esc(secondary)}</text>`,
    );
  }

  return `<g>${lines.join('\n  ')}</g>`;
}

function layoutShapes(
  w: number,
  h: number,
  L: SwaggenLayoutTemplatePreviewLayout,
  mo: 'light' | 'dark' | undefined,
): string[] {
  const shapes: string[] = [];

  if (L === 'photoTop') {
    shapes.push(
      `<linearGradient id="ph" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#000" stop-opacity="0.5"/><stop offset="100%" stop-color="#000" stop-opacity="0"/></linearGradient>`,
    );
    shapes.push(
      `<rect x="0" y="0" width="${w}" height="${Math.round(h * 0.44)}" fill="url(#ph)"/>`,
    );
  }

  if (L === 'fullBleedPhoto') {
    shapes.push(
      `<linearGradient id="fb" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stop-color="rgb(15,23,42)" stop-opacity="0.92"/><stop offset="100%" stop-color="rgb(15,23,42)" stop-opacity="0.12"/></linearGradient>`,
    );
    shapes.push(`<rect x="0" y="0" width="${w}" height="${h}" fill="url(#fb)"/>`);
    shapes.push(
      `<rect x="${Math.round(w * 0.05)}" y="${h - Math.round(h * 0.08)}" width="${Math.round(w * 0.9)}" height="${Math.round(h * 0.03)}" rx="4" fill="rgba(255,255,255,0.92)"/>`,
    );
  }

  if (L === 'splitLeft') {
    shapes.push(
      `<rect x="0" y="0" width="${Math.round(w * 0.38)}" height="${h}" fill="#000" fill-opacity="0.42"/>`,
    );
  }

  if (L === 'splitTopBar') {
    shapes.push(
      `<rect x="0" y="0" width="${w}" height="${Math.round(h * 0.22)}" fill="#1d4ed8" fill-opacity="0.96"/>`,
    );
  }

  if (L === 'pollStack') {
    const insetX = Math.round(w * 0.03);
    const barW = w - 2 * insetX;
    const yTop = Math.round(h * 0.38);
    const yBot = h - Math.round(h * 0.18);
    const bandH = yBot - yTop;
    const barH = Math.max(8, Math.round(bandH * 0.22));
    const gap = Math.max(4, Math.round(bandH * 0.12));
    const yMid = yTop + (bandH - (2 * barH + gap)) / 2;
    shapes.push(
      `<rect x="${insetX}" y="${yMid}" width="${barW}" height="${barH}" rx="6" fill="#6366f1" fill-opacity="0.92"/>`,
    );
    shapes.push(
      `<rect x="${insetX}" y="${yMid + barH + gap}" width="${barW}" height="${barH}" rx="6" fill="#8b5cf6" fill-opacity="0.92"/>`,
    );
  }

  if (L === 'cardsRow') {
    const top = Math.round(h * 0.32);
    const bh = Math.round(h * 0.36);
    const gap = Math.round(w * 0.01);
    const cw = (w - Math.round(w * 0.04) - gap * 2) / 3;
    const x0 = Math.round(w * 0.02);
    for (let i = 0; i < 3; i++) {
      shapes.push(
        `<rect x="${x0 + i * (cw + gap)}" y="${top}" width="${cw}" height="${bh}" rx="8" fill="#fff" fill-opacity="0.9"/>`,
      );
    }
  }

  if (L === 'kpiRow') {
    const top = Math.round(h * 0.22);
    const bh = Math.round(h * 0.52);
    const gap = Math.round(w * 0.008);
    const cw = (w - Math.round(w * 0.016) - gap * 3) / 4;
    const x0 = Math.round(w * 0.008);
    for (let i = 0; i < 4; i++) {
      shapes.push(
        `<rect x="${x0 + i * (cw + gap)}" y="${top}" width="${cw}" height="${bh}" rx="6" fill="#1e293b" stroke="#38bdf8" stroke-opacity="0.5" stroke-width="2"/>`,
      );
    }
  }

  if (L === 'timeline') {
    const y = Math.round(h * 0.42);
    shapes.push(
      `<line x1="${Math.round(w * 0.04)}" y1="${y}" x2="${w - Math.round(w * 0.04)}" y2="${y}" stroke="#94a3b8" stroke-width="3"/>`,
    );
    const step = (w - Math.round(w * 0.08)) / 3;
    const x0 = Math.round(w * 0.04);
    for (let i = 0; i < 4; i++) {
      shapes.push(
        `<circle cx="${x0 + i * step}" cy="${y}" r="8" fill="#3b82f6" stroke="#fff" stroke-width="3"/>`,
      );
    }
  }

  if (L === 'borderedDoc') {
    shapes.push(
      `<rect x="${Math.round(w * 0.02)}" y="${Math.round(h * 0.02)}" width="${w - Math.round(w * 0.04)}" height="${h - Math.round(h * 0.04)}" rx="6" fill="#fffbeb" fill-opacity="0.4" stroke="#b45309" stroke-opacity="0.5" stroke-width="3"/>`,
    );
  }

  if (L === 'darkPanel') {
    shapes.push(
      `<rect x="${Math.round(w * 0.02)}" y="${Math.round(h * 0.24)}" width="${w - Math.round(w * 0.04)}" height="${Math.round(h * 0.72)}" rx="10" fill="#000" fill-opacity="0.58" stroke="#fff" stroke-opacity="0.14"/>`,
    );
  }

  if (L === 'minimal') {
    const dark = mo === 'dark';
    const bar = dark ? 'rgba(255,255,255,0.55)' : 'rgba(24,24,27,0.5)';
    const bar2 = dark ? 'rgba(255,255,255,0.38)' : 'rgba(24,24,27,0.35)';
    const y0 = Math.round(h * 0.62);
    shapes.push(
      `<rect x="${Math.round(w * 0.08)}" y="${y0}" width="${Math.round(w * 0.84)}" height="8" rx="4" fill="${bar}"/>`,
    );
    shapes.push(
      `<rect x="${Math.round(w * 0.08)}" y="${y0 + 18}" width="${Math.round(w * 0.68)}" height="8" rx="4" fill="${bar2}"/>`,
    );
  }

  if (L === 'gradient') {
    const cx = w / 2;
    const y0 = Math.round(h * 0.22);
    shapes.push(
      `<circle cx="${cx}" cy="${y0}" r="9" fill="rgba(255,255,255,0.4)"/>`,
    );
    shapes.push(
      `<rect x="${Math.round(w * 0.1)}" y="${Math.round(h * 0.62)}" width="${Math.round(w * 0.8)}" height="6" rx="3" fill="rgba(255,255,255,0.2)"/>`,
    );
  }

  return shapes;
}

export function buildTemplatePreviewSvgString(
  template: Pick<SwaggenLayoutTemplateDefinition, 'presetId' | 'preview' | 'name'>,
): string {
  const { presetId, preview, name } = template;
  const { w, h } = previewDimensionsForPreset(presetId);
  const bg = preview.background?.trim() || '#6366f1';
  const gid = 'tpBg';

  const { defs: bgDef, fillAttr } = backgroundDefs(bg, gid, w, h);
  const defs: string[] = [];
  if (bgDef) defs.push(bgDef);

  const L = preview.layout;
  const mo = preview.minimalOn;

  const layoutDefParts: string[] = [];
  const shapeParts: string[] = [];

  const rawShapes = layoutShapes(w, h, L, mo);
  for (const chunk of rawShapes) {
    if (chunk.startsWith('<linearGradient')) {
      layoutDefParts.push(chunk);
    } else {
      shapeParts.push(chunk);
    }
  }
  if (layoutDefParts.length) defs.push(`<defs>${layoutDefParts.join('')}</defs>`);

  const thumb = preview.thumb ?? fallbackThumb(name);
  const primary = truncate(thumb.primary, 34);
  const secondary = thumb.secondary
    ? truncate(thumb.secondary, 40)
    : undefined;

  const textBlock = thumbTextSvg(w, h, preview, primary, secondary);

  const innerDefs =
    defs.length > 0
      ? `<defs>${defs
          .map(d => (d.startsWith('<defs>') ? d.slice(6, -7) : d))
          .join('')}</defs>`
      : '';

  const shapesBlock = [...shapeParts, textBlock].join('\n  ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(name)}">
  ${innerDefs}
  <rect width="100%" height="100%" ${fillAttr}/>
  ${shapesBlock}
</svg>`;
}

export function buildBlankCanvasPreviewSvgString(): string {
  const w = 800;
  const h = 500;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="Blank canvas">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f4f4f5"/><stop offset="100%" stop-color="#e4e4e7"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <rect x="32" y="32" width="${w - 64}" height="${h - 64}" rx="12" fill="rgba(255,255,255,0.5)" stroke="#a1a1aa" stroke-width="3" stroke-dasharray="12 8"/>
  <line x1="${w / 2 - 20}" y1="${h / 2}" x2="${w / 2 + 20}" y2="${h / 2}" stroke="#71717a" stroke-width="3"/>
  <line x1="${w / 2}" y1="${h / 2 - 20}" x2="${w / 2}" y2="${h / 2 + 20}" stroke="#71717a" stroke-width="3"/>
</svg>`;
}
