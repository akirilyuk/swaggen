'use client';

import Image from 'next/image';

import type { SwaggenElement } from '@/types/swaggenCanvas';

/**
 * Renders a canvas image layer. Uses `next/image` for known hosts (see `next.config` remotePatterns)
 * so the optimizer can serve them reliably; falls back to `<img>` for arbitrary user URLs, SVG, and data URLs.
 */
export function SwaggenImageLayer({ el }: { el: SwaggenElement }) {
  if (el.kind !== 'image' || !el.image) return null;
  const src = el.image.src;
  const objectFit = el.image.objectFit;
  const objectPosition = el.image.objectPosition;

  const isDataOrBlob = src.startsWith('data:') || src.startsWith('blob:');
  const isSvg = /\.svg(\?|#|$)/i.test(src) || src.startsWith('data:image/svg');
  const useNextImage =
    !isDataOrBlob &&
    !isSvg &&
    (src.startsWith('/') ||
      src.startsWith('https://images.unsplash.com/') ||
      src.startsWith('https://placehold.co/'));

  if (!useNextImage) {
    return (
      <img
        src={src}
        alt=""
        className="h-full w-full pointer-events-none"
        style={{
          objectFit,
          ...(objectPosition ? { objectPosition } : {}),
        }}
        draggable={false}
        loading="eager"
        decoding="async"
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <Image
      src={src}
      alt=""
      fill
      className="pointer-events-none"
      style={{
        objectFit,
        ...(objectPosition ? { objectPosition } : {}),
      }}
      sizes={`${Math.max(1, Math.ceil(el.width))}px`}
      unoptimized
    />
  );
}
