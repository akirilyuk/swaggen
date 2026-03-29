/**
 * Downloads stock photos (Unsplash / Pexels), crops to each template preset aspect,
 * and writes `public/template-previews/{templateId}.jpg`.
 *
 * URLs live in `src/lib/templateCoverImageSources.ts`.
 *
 * Run: `pnpm run download:template-covers -- --write`
 */

import { mkdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

import { SWAGGEN_LAYOUT_TEMPLATES } from '../src/lib/swaggenTemplatesRegistry';
import { TEMPLATE_COVER_IMAGE_URLS } from '../src/lib/templateCoverImageSources';
import { previewDimensionsForPreset } from '../src/lib/templatePreviewSvg';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(packageRoot, 'public', 'template-previews');

const MIN_BYTES = 2048;

const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
};

async function fetchImageBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url, { headers: FETCH_HEADERS });
  if (!res.ok) {
    throw new Error(`GET ${url} → ${res.status} ${res.statusText}`);
  }
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

async function writeCover(
  presetId: string,
  url: string,
  outPath: string,
  dimensions?: { w: number; h: number },
): Promise<void> {
  const { w, h } = dimensions ?? previewDimensionsForPreset(presetId);
  const raw = await fetchImageBuffer(url);
  await sharp(raw)
    .rotate()
    .resize(w, h, { fit: 'cover', position: 'attention' })
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(outPath);

  const size = statSync(outPath).size;
  if (size < MIN_BYTES) {
    throw new Error(`Output too small (${size} bytes): ${outPath}`);
  }
}

async function main(): Promise<void> {
  if (!process.argv.includes('--write')) {
    console.error(
      'Refusing to write. Run: pnpm run download:template-covers -- --write',
    );
    process.exit(1);
  }

  mkdirSync(outDir, { recursive: true });

  for (const t of SWAGGEN_LAYOUT_TEMPLATES) {
    const url = TEMPLATE_COVER_IMAGE_URLS[t.id];
    if (!url) {
      throw new Error(`Missing TEMPLATE_COVER_IMAGE_URLS["${t.id}"]`);
    }
    const outPath = path.join(outDir, `${t.id}.jpg`);
    await writeCover(t.presetId, url, outPath);
    console.log('wrote', outPath);
  }

  const blankUrl = TEMPLATE_COVER_IMAGE_URLS['blank-canvas'];
  if (!blankUrl) {
    throw new Error('Missing blank-canvas URL');
  }
  const blankPath = path.join(outDir, 'blank-canvas.jpg');
  await writeCover('ig-square', blankUrl, blankPath, { w: 800, h: 500 });
  console.log('wrote', blankPath);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
