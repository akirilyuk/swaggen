import type { SwaggenDocument, SwaggenElement } from '@/types/swaggenCanvas';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function elementToHtml(el: SwaggenElement): string {
  const base = [
    'position:absolute',
    `left:${el.x}px`,
    `top:${el.y}px`,
    `width:${el.width}px`,
    `height:${el.height}px`,
    `transform:rotate(${el.rotation}deg)`,
    `opacity:${el.opacity}`,
    `z-index:${el.zIndex}`,
    'box-sizing:border-box',
  ];

  if (el.kind === 'text' && el.text) {
    const t = el.text;
    const inner = escapeHtml(t.content).replace(/\n/g, '<br/>');
    return `<div style="${base.join(';')}"><div style="width:100%;height:100%;overflow:hidden;white-space:pre-wrap;word-break:break-word;padding:16px;box-sizing:border-box;font-family:${escapeHtml(t.fontFamily)};font-size:${t.fontSize}px;font-weight:${t.fontWeight};color:${escapeHtml(t.color)};text-align:${t.textAlign};line-height:${t.lineHeight}">${inner}</div></div>`;
  }

  if (el.kind === 'image' && el.image) {
    const pos = el.image.objectPosition
      ? `;object-position:${escapeHtml(el.image.objectPosition)}`
      : '';
    return `<div style="${base.join(';')}"><img src="${escapeHtml(el.image.src)}" alt="" style="width:100%;height:100%;object-fit:${el.image.objectFit}${pos};pointer-events:none" /></div>`;
  }

  if (el.kind === 'shape' && el.shape) {
    return `<div style="${base.join(';')}"><div style="width:100%;height:100%;border-radius:${el.shape.kind === 'ellipse' ? '50%' : `${el.shape.borderRadius}px`};background:${el.shape.fill};border:${el.shape.strokeWidth > 0 ? `${el.shape.strokeWidth}px solid ${el.shape.stroke}` : 'none'}"></div></div>`;
  }

  return '';
}

/** Self-contained HTML file for a Swaggen canvas page (static hosting). */
export function buildSwaggenPageHtmlStandalone(doc: SwaggenDocument): string {
  const sorted = [...doc.elements].sort((a, b) => a.zIndex - b.zIndex);
  const inner = sorted.map(elementToHtml).join('\n');
  const title = escapeHtml(doc.name || 'Page');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #f4f4f5; min-height: 100vh; display: flex; justify-content: center; align-items: flex-start; padding: 24px; font-family: system-ui, sans-serif; }
    .artboard { position: relative; box-shadow: 0 4px 24px rgba(0,0,0,.12); }
  </style>
</head>
<body>
  <div class="artboard" style="width:${doc.artboardWidth}px;min-height:${doc.artboardHeight}px;height:${doc.artboardHeight}px;background:${doc.background}">
${inner}
  </div>
</body>
</html>
`;
}

export function downloadSwaggenPageHtmlFile(doc: SwaggenDocument, fileBaseName: string): void {
  const html = buildSwaggenPageHtmlStandalone(doc);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const base = fileBaseName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9._-]/g, '');
  a.download = `${base || 'page'}.html`;
  a.click();
  URL.revokeObjectURL(url);
}
