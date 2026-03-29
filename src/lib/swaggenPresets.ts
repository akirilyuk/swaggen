import { v4 as uuid } from 'uuid';

import type { SwaggenArtboardPreset, SwaggenDocument } from '@/types/swaggenCanvas';

export const ARTBOARD_PRESETS: SwaggenArtboardPreset[] = [
  { id: 'ig-square', name: 'Instagram · Post (1:1)', width: 1080, height: 1080 },
  { id: 'ig-story', name: 'Instagram · Story / Reels', width: 1080, height: 1920 },
  {
    id: 'social-wide',
    name: 'Facebook / LinkedIn · Landscape',
    width: 1200,
    height: 630,
  },
  {
    id: 'pinterest-pin',
    name: 'Pinterest · Pin (2:3)',
    width: 1000,
    height: 1500,
  },
  { id: 'twitter-post', name: 'X / Twitter · Post', width: 1200, height: 675 },
  { id: 'presentation', name: 'Presentation · 16:9', width: 1920, height: 1080 },
  { id: 'youtube', name: 'YouTube · Thumbnail', width: 1280, height: 720 },
  { id: 'a4', name: 'A4 · Print / PDF', width: 1240, height: 1754 },
  { id: 'slide-4-3', name: 'Slide · 4:3', width: 1024, height: 768 },
  { id: 'logo-square', name: 'Logo · Square', width: 500, height: 500 },
  { id: 'business-card', name: 'Business card · US', width: 1050, height: 600 },
];

export function createEmptyDocument(
  preset: SwaggenArtboardPreset,
  name = 'Untitled design',
): SwaggenDocument {
  return {
    id: uuid(),
    name,
    artboardWidth: preset.width,
    artboardHeight: preset.height,
    background: '#ffffff',
    elements: [],
  };
}
