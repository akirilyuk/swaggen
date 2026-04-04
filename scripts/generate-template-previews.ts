/**
 * Renders `public/template-previews/{templateId}.jpg` from each template’s
 * metadata (`thumb`, layout, background). SVG is built in `templatePreviewSvg.ts`,
 * rasterized with **Resvg**, then encoded to JPEG with Sharp.
 *
 * Output path is fixed to this package’s `public/` (via `import.meta.url`), not
 * `process.cwd()`.
 *
 * Run: `pnpm run generate:template-previews -- --write`
 */

import { mkdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderAsync } from '@resvg/resvg-js';
import sharp from 'sharp';

import { SWAGGEN_LAYOUT_TEMPLATES } from '../src/lib/swaggenTemplatesRegistry';
import {
  buildBlankCanvasPreviewSvgString,
  buildTemplatePreviewSvgString,
} from '../src/lib/templatePreviewSvg';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(packageRoot, 'public', 'template-previews');

const MIN_JPEG_BYTES = 512;

async function svgToJpeg(svg: string, outPath: string): Promise<void> {
  const rendered = await renderAsync(svg, {
    fitTo: { mode: 'original' },
    background: '#ffffff',
    /** Required for `<text>` in previews (false yields missing glyphs / empty tiles) */
    font: { loadSystemFonts: true },
  });
  const png = rendered.asPng();
  if (png.length < 64) {
    throw new Error(`Resvg produced an empty or tiny PNG (${png.length} bytes) for ${outPath}`);
  }
  await sharp(png)
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(outPath);
  const size = statSync(outPath).size;
  if (size < MIN_JPEG_BYTES) {
    throw new Error(`JPEG too small (${size} bytes), likely corrupt: ${outPath}`);
  }
}

async function main(): Promise<void> {
  if (!process.argv.includes('--write')) {
    console.error(
      'Refusing to overwrite JPEGs. Run: pnpm run generate:template-previews -- --write',
    );
    process.exit(1);
  }

  console.warn(
    '\n[generate:template-previews] Writes abstract vector raster JPEGs. Gallery stock photos live in `templateCoverImageSources.ts`; refresh them with:\n  pnpm run download:template-covers -- --write\n',
  );

  mkdirSync(outDir, { recursive: true });

  for (const t of SWAGGEN_LAYOUT_TEMPLATES) {
    const svg = buildTemplatePreviewSvgString(t);
    const file = path.join(outDir, `${t.id}.jpg`);
    await svgToJpeg(svg, file);
    console.log('wrote', file);
  }

  const blank = path.join(outDir, 'blank-canvas.jpg');
  await svgToJpeg(buildBlankCanvasPreviewSvgString(), blank);
  console.log('wrote', blank);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
