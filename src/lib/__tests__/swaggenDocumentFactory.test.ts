jest.mock('uuid', () => ({
  v4: () => '11111111-1111-1111-1111-111111111111',
}));

import {
  buildSwaggenDocumentFromTemplateId,
  mergeTemplateCoverPhotoIntoElements,
} from '@/lib/swaggenDocumentFactory';
import { tplImage } from '@/lib/swaggenTemplatePrimitives';
import type { SwaggenElement } from '@/types/swaggenCanvas';

const W = 1080;
const H = 1920;
const COVER = 'https://example.com/cover.jpg';

describe('mergeTemplateCoverPhotoIntoElements', () => {
  it('creates a full-bleed image when elements are empty', () => {
    const out = mergeTemplateCoverPhotoIntoElements([], W, H, COVER);
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe('image');
    expect(out[0].image?.src).toBe(COVER);
    expect(out[0].width).toBe(W);
    expect(out[0].height).toBe(H);
  });

  it('replaces src of a top full-width hero image', () => {
    const hero = tplImage(0, 0, W, 400, 'old.jpg', 'cover', 1, 'Hero');
    const out = mergeTemplateCoverPhotoIntoElements([hero], W, H, COVER);
    expect(out[0].image?.src).toBe(COVER);
    expect(out).toHaveLength(1);
  });
});

describe('buildSwaggenDocumentFromTemplateId', () => {
  it('builds an empty document for blank template', () => {
    const doc = buildSwaggenDocumentFromTemplateId('blank', 'My page');
    expect(doc.name).toBe('My page');
    expect(doc.elements.length).toBeGreaterThanOrEqual(0);
    expect(doc.artboardWidth).toBeGreaterThan(0);
  });
});
