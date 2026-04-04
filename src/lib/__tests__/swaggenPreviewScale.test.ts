import { swaggenPreviewScale } from '@/lib/swaggenPreviewScale';
import type { SwaggenDocument } from '@/types/swaggenCanvas';

function doc(w: number, h: number): SwaggenDocument {
  return {
    id: '1',
    name: 't',
    artboardWidth: w,
    artboardHeight: h,
    background: '#fff',
    elements: [],
  };
}

describe('swaggenPreviewScale', () => {
  it('returns 1 when artboard fits', () => {
    expect(swaggenPreviewScale(doc(400, 300), 800, 600)).toBe(1);
  });

  it('scales down to the tighter axis', () => {
    expect(swaggenPreviewScale(doc(1000, 500), 500, 500)).toBe(0.5);
    expect(swaggenPreviewScale(doc(200, 800), 400, 400)).toBe(0.5);
  });

  it('returns 1 for non-positive dimensions', () => {
    expect(swaggenPreviewScale(doc(0, 100), 500, 500)).toBe(1);
    expect(swaggenPreviewScale(doc(100, 0), 500, 500)).toBe(1);
  });
});
