/**
 * Rich layout builders for Swaggen layout gallery templates (presentation-style compositions).
 * Coordinates scale with artboard width/height.
 */

import type { SwaggenElement } from '@/types/swaggenCanvas';

import {
  reindexZ,
  tplEllipse,
  tplImage,
  tplLine,
  tplRect,
  tplText,
} from '@/lib/swaggenTemplatePrimitives';

const m = Math.min;
const PH = {
  hero: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1400&q=85&auto=format&fit=crop',
  cafe: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1400&q=85&auto=format&fit=crop',
  house: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1400&q=85&auto=format&fit=crop',
  concert: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1400&q=85&auto=format&fit=crop',
  team: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1400&q=85&auto=format&fit=crop',
  food: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=1400&q=85&auto=format&fit=crop',
  workspace: 'https://images.unsplash.com/photo-1497032205916-ac775f0649b4?w=1400&q=85&auto=format&fit=crop',
  gradient: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=1400&q=85&auto=format&fit=crop',
};

export function buildBlank(w: number, h: number) {
  return {
    elements: [] as SwaggenElement[],
    background: '#ffffff',
  };
}

export function buildIgGradientSale(w: number, h: number) {
  const pad = Math.round(m(w, h) * 0.08);
  const els: SwaggenElement[] = [
    tplRect(0, 0, w, h, 'linear-gradient(145deg, #f59e0b 0%, #ef4444 55%, #be123c 100%)', 'transparent', 0, 1),
    tplText(pad, Math.round(h * 0.12), w - pad * 2, 80, 'FLASH SALE', { fontSize: Math.round(m(w, h) * 0.04), fontWeight: 800, color: '#ffffff', textAlign: 'center', lineHeight: 1 }, 2, 'Eyebrow'),
    tplText(pad, Math.round(h * 0.22), w - pad * 2, Math.round(h * 0.28), '50% OFF', { fontSize: Math.round(m(w, h) * 0.18), fontWeight: 900, color: '#ffffff', textAlign: 'center', lineHeight: 0.95 }, 3, 'Headline'),
    tplText(pad, Math.round(h * 0.48), w - pad * 2, 60, 'THIS WEEKEND ONLY', { fontSize: Math.round(m(w, h) * 0.032), fontWeight: 600, color: '#ffffff', textAlign: 'center' }, 4, 'Sub'),
    tplRect(pad, Math.round(h * 0.62), w - pad * 2, Math.round(h * 0.22), 'rgba(0,0,0,0.08)', 'transparent', 20, 5),
    tplText(pad, Math.round(h * 0.66), w - pad * 2, 120, 'CODE: SUMMER50', { fontSize: Math.round(m(w, h) * 0.045), fontWeight: 700, color: '#fff', textAlign: 'center' }, 6, 'Code'),
  ];
  return { elements: reindexZ(els), background: '#111827' };
}

export function buildIgQuoteSoft(w: number, h: number) {
  const pad = Math.round(m(w, h) * 0.1);
  const els: SwaggenElement[] = [
    tplRect(0, 0, w, h, 'linear-gradient(180deg, #fdf2f8 0%, #fce7f3 100%)', 'transparent', 0, 1),
    tplText(pad, Math.round(h * 0.18), w - pad * 2, Math.round(h * 0.35), '"Creativity is intelligence having fun."', { fontSize: Math.round(m(w, h) * 0.055), fontWeight: 600, color: '#831843', textAlign: 'center', lineHeight: 1.15 }, 2, 'Quote'),
    tplLine(pad, Math.round(h * 0.52), w - pad * 2, 4, '#be185d', 3, 3),
    tplText(pad, Math.round(h * 0.56), w - pad * 2, 48, '— Albert Einstein', { fontSize: Math.round(m(w, h) * 0.028), fontWeight: 500, color: '#831843', textAlign: 'center' }, 4, 'Attribution'),
  ];
  return { elements: reindexZ(els), background: '#fdf2f8' };
}

export function buildIgFoodAnnouncement(w: number, h: number) {
  const pad = Math.round(m(w, h) * 0.06);
  const els: SwaggenElement[] = [
    tplRect(0, 0, w, h, '#1c1917', 'transparent', 0, 1),
    tplImage(
      pad,
      pad,
      w - pad * 2,
      Math.round(h * 0.52),
      PH.food,
      'cover',
      2,
      'Dish',
      'center 44%',
    ),
    tplRect(pad, Math.round(h * 0.58), w - pad * 2, Math.round(h * 0.34), '#292524', 'transparent', 16, 3),
    tplText(pad + 16, Math.round(h * 0.62), w - (pad + 16) * 2, 72, 'NEW MENU', { fontSize: Math.round(m(w, h) * 0.065), fontWeight: 800, color: '#fffbeb', textAlign: 'center' }, 4, 'Title'),
    tplText(pad + 16, Math.round(h * 0.72), w - (pad + 16) * 2, 56, 'Truffle pasta · Fire-roasted veg · House sourdough', { fontSize: Math.round(m(w, h) * 0.028), fontWeight: 500, color: '#e7e5e4', textAlign: 'center', lineHeight: 1.3 }, 5, 'Details'),
  ];
  return { elements: reindexZ(els), background: '#1c1917' };
}

export function buildIgTipsCarousel(w: number, h: number) {
  const pad = Math.round(m(w, h) * 0.08);
  const els: SwaggenElement[] = [
    tplRect(0, 0, w, h, 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)', 'transparent', 0, 1),
    tplText(pad, pad, w - pad * 2, 56, '5 tips for better sleep', { fontSize: Math.round(m(w, h) * 0.038), fontWeight: 700, color: '#ffffff' }, 2, 'Title'),
    ...[1, 2, 3, 4, 5].map((n, i) => {
      const y = Math.round(h * 0.14) + i * Math.round(h * 0.14);
      return tplText(
        pad + 40,
        y,
        w - pad * 2 - 40,
        48,
        `${n}. Consistent wake time`,
        { fontSize: Math.round(m(w, h) * 0.032), fontWeight: 600, color: '#fff' },
        10 + i,
        `Tip ${n}`,
      );
    }),
    tplEllipse(pad, Math.round(h * 0.14), 28, 28, '#fff', 'transparent', 0, 20),
  ];
  return { elements: reindexZ(els), background: '#0c4a6e' };
}

export function buildStoryPoll(w: number, h: number) {
  const pad = Math.round(m(w, h) * 0.08);
  const els: SwaggenElement[] = [
    tplRect(0, 0, w, h, 'linear-gradient(180deg, #312e81 0%, #1e1b4b 100%)', 'transparent', 0, 1),
    tplText(pad, Math.round(h * 0.12), w - pad * 2, 100, 'Quick poll', { fontSize: Math.round(m(w, h) * 0.05), fontWeight: 800, color: '#e0e7ff', textAlign: 'center' }, 2, 'Label'),
    tplText(pad, Math.round(h * 0.22), w - pad * 2, 120, 'Pizza or sushi tonight?', { fontSize: Math.round(m(w, h) * 0.045), fontWeight: 700, color: '#fff', textAlign: 'center', lineHeight: 1.2 }, 3, 'Question'),
    tplRect(pad, Math.round(h * 0.42), w - pad * 2, 88, '#4f46e5', 'transparent', 24, 4),
    tplText(pad, Math.round(h * 0.445), w - pad * 2, 56, 'PIZZA', { fontSize: Math.round(m(w, h) * 0.04), fontWeight: 800, color: '#fff', textAlign: 'center' }, 5, 'A'),
    tplRect(pad, Math.round(h * 0.56), w - pad * 2, 88, '#7c3aed', 'transparent', 24, 6),
    tplText(pad, Math.round(h * 0.585), w - pad * 2, 56, 'SUSHI', { fontSize: Math.round(m(w, h) * 0.04), fontWeight: 800, color: '#fff', textAlign: 'center' }, 7, 'B'),
  ];
  return { elements: reindexZ(els), background: '#1e1b4b' };
}

export function buildStoryProductDrop(w: number, h: number) {
  const pad = Math.round(m(w, h) * 0.06);
  const fixed: SwaggenElement[] = [
    tplImage(
      0,
      0,
      w,
      Math.round(h * 0.55),
      PH.gradient,
      'cover',
      1,
      'Hero',
      'center 36%',
    ),
    tplRect(
      0,
      Math.round(h * 0.34),
      w,
      Math.round(h * 0.24),
      'linear-gradient(180deg, transparent 0%, rgba(250,250,250,0.92) 78%, #fafafa 100%)',
      'transparent',
      0,
      2,
    ),
    tplRect(0, Math.round(h * 0.48), w, Math.round(h * 0.52), '#fafafa', 'transparent', 0, 3),
    tplText(pad, Math.round(h * 0.56), w - pad * 2, 64, 'NEW DROP', { fontSize: Math.round(m(w, h) * 0.032), fontWeight: 800, color: '#4f46e5' }, 4, 'Eyebrow'),
    tplText(pad, Math.round(h * 0.62), w - pad * 2, 140, 'Aura Headphones', { fontSize: Math.round(m(w, h) * 0.07), fontWeight: 900, color: '#0a0a0a' }, 5, 'Product'),
    tplText(pad, Math.round(h * 0.76), w - pad * 2, 80, 'Noise cancelling · 40h battery', { fontSize: Math.round(m(w, h) * 0.028), fontWeight: 500, color: '#3f3f46' }, 6, 'Specs'),
  ];
  return { elements: reindexZ(fixed), background: '#fafafa' };
}

export function buildFacebookCorporate(w: number, h: number) {
  const pad = Math.round(m(w, h) * 0.06);
  const els: SwaggenElement[] = [
    tplRect(0, 0, w, Math.round(h * 0.22), '#1d4ed8', 'transparent', 0, 1),
    tplText(pad, Math.round(h * 0.06), w - pad * 2, 56, 'NORTHRIVER ANALYTICS', { fontSize: Math.round(m(w, h) * 0.035), fontWeight: 700, color: '#fff' }, 2, 'Brand'),
    tplText(pad, Math.round(h * 0.28), w - pad * 2, 100, 'Data that moves your business forward.', { fontSize: Math.round(m(w, h) * 0.048), fontWeight: 700, color: '#0f172a', lineHeight: 1.15 }, 3, 'Headline'),
    tplText(pad, Math.round(h * 0.45), w - pad * 2, 100, 'Book a free strategy session with our team this month.', { fontSize: Math.round(m(w, h) * 0.028), fontWeight: 500, color: '#334155', lineHeight: 1.35 }, 4, 'Body'),
    tplRect(pad, Math.round(h * 0.62), 220, 52, '#1d4ed8', 'transparent', 8, 5),
    tplText(pad + 24, Math.round(h * 0.63), 200, 40, 'Learn more', { fontSize: Math.round(m(w, h) * 0.028), fontWeight: 700, color: '#fff', textAlign: 'center' }, 6, 'CTA'),
  ];
  return { elements: reindexZ(els), background: '#f8fafc' };
}

export function buildLinkedInHiring(w: number, h: number) {
  const pad = Math.round(m(w, h) * 0.07);
  const els: SwaggenElement[] = [
    tplRect(0, 0, w, h, '#f0f9ff', 'transparent', 0, 1),
    tplText(pad, Math.round(h * 0.12), w - pad * 2, 72, "We're hiring", { fontSize: Math.round(m(w, h) * 0.055), fontWeight: 800, color: '#0c4a6e' }, 2, 'Title'),
    tplText(pad, Math.round(h * 0.24), w - pad * 2, 48, 'Senior Product Designer · Remote-friendly', { fontSize: Math.round(m(w, h) * 0.028), fontWeight: 600, color: '#075985' }, 3, 'Role'),
    tplImage(
      pad,
      Math.round(h * 0.38),
      w - pad * 2,
      Math.round(h * 0.42),
      PH.team,
      'cover',
      4,
      'Team',
      'center 28%',
    ),
    tplRect(
      pad,
      Math.round(h * 0.58),
      w - pad * 2,
      Math.round(h * 0.28),
      'linear-gradient(180deg, transparent 0%, rgba(240,249,255,0.82) 45%, #f0f9ff 100%)',
      'transparent',
      0,
      5,
    ),
    tplText(pad, Math.round(h * 0.84), w - pad * 2, 48, 'Apply at careers.yourcompany.com', { fontSize: Math.round(m(w, h) * 0.026), fontWeight: 600, color: '#155e75', textAlign: 'center' }, 6, 'Footer'),
  ];
  return { elements: reindexZ(els), background: '#f0f9ff' };
}

export function buildPinterestRecipe(w: number, h: number) {
  const pad = Math.round(m(w, h) * 0.05);
  const els: SwaggenElement[] = [
    tplImage(0, 0, w, Math.round(h * 0.45), PH.food, 'cover', 1, 'Food', 'center 38%'),
    tplRect(
      0,
      Math.round(h * 0.3),
      w,
      Math.round(h * 0.18),
      'linear-gradient(180deg, transparent 0%, rgba(255,251,235,0.97) 100%)',
      'transparent',
      0,
      2,
    ),
    tplRect(0, Math.round(h * 0.42), w, Math.round(h * 0.58), '#fffbeb', 'transparent', 0, 3),
    tplText(pad, Math.round(h * 0.48), w - pad * 2, 100, '15-min creamy tuscan chicken', { fontSize: Math.round(m(w, h) * 0.038), fontWeight: 800, color: '#451a03', lineHeight: 1.15 }, 4, 'Title'),
    tplText(pad, Math.round(h * 0.58), w - pad * 2, 200, 'Garlic · sun-dried tomatoes · spinach · parmesan. One pan, weeknight win.', { fontSize: Math.round(m(w, h) * 0.026), fontWeight: 500, color: '#78350f', lineHeight: 1.4 }, 5, 'Copy'),
    tplEllipse(pad, Math.round(h * 0.78), 64, 64, '#f59e0b', 'transparent', 0, 6),
    tplText(pad, Math.round(h * 0.795), 64, 40, '★', { fontSize: 28, fontWeight: 700, color: '#fff', textAlign: 'center' }, 7, 'Star'),
  ];
  return { elements: reindexZ(els), background: '#fffbeb' };
}

export function buildTwitterNews(w: number, h: number) {
  const pad = Math.round(m(w, h) * 0.07);
  const els: SwaggenElement[] = [
    tplRect(0, 0, w, h, '#0f1419', 'transparent', 0, 1),
    tplText(pad, Math.round(h * 0.15), w - pad * 2, 140, 'Breaking: clean energy milestone reached in Q2', { fontSize: Math.round(m(w, h) * 0.048), fontWeight: 800, color: '#f8fafc', lineHeight: 1.15 }, 2, 'Headline'),
    tplText(pad, Math.round(h * 0.42), w - pad * 2, 80, 'Grid capacity up 18% year over year.', { fontSize: Math.round(m(w, h) * 0.03), fontWeight: 500, color: '#e2e8f0' }, 3, 'Dek'),
    tplLine(pad, Math.round(h * 0.58), w - pad * 2, 4, '#334155', 2, 4),
    tplText(pad, Math.round(h * 0.64), w - pad * 2, 40, 'READ THE REPORT →', { fontSize: Math.round(m(w, h) * 0.026), fontWeight: 700, color: '#38bdf8' }, 5, 'CTA'),
  ];
  return { elements: reindexZ(els), background: '#0f1419' };
}

export function buildYoutubeBold(w: number, h: number) {
  const pad = Math.round(m(w, h) * 0.05);
  const els: SwaggenElement[] = [
    tplRect(0, 0, w, h, '#18181b', 'transparent', 0, 1),
    tplImage(
      pad,
      pad,
      Math.round(w * 0.38),
      h - pad * 2,
      PH.workspace,
      'cover',
      2,
      'Host',
      'center 22%',
    ),
    tplRect(Math.round(w * 0.45), 0, Math.round(w * 0.55), h, '#27272a', 'transparent', 0, 3),
    tplText(Math.round(w * 0.47), Math.round(h * 0.18), Math.round(w * 0.48), 200, 'I tried coding with AI for 30 days', { fontSize: Math.round(m(w, h) * 0.065), fontWeight: 900, color: '#ffffff', lineHeight: 1.05 }, 4, 'Title'),
    tplRect(Math.round(w * 0.47), Math.round(h * 0.72), 160, 44, '#ef4444', 'transparent', 8, 5),
    tplText(Math.round(w * 0.47), Math.round(h * 0.73), 160, 40, 'WOW', { fontSize: 26, fontWeight: 900, color: '#fff', textAlign: 'center' }, 6, 'Sticker'),
  ];
  return { elements: reindexZ(els), background: '#18181b' };
}

export function buildYoutubeGaming(w: number, h: number) {
  const pad = Math.round(m(w, h) * 0.04);
  const els: SwaggenElement[] = [
    tplRect(0, 0, w, h, 'linear-gradient(135deg, #09090b 0%, #3b0764 50%, #09090b 100%)', 'transparent', 0, 1),
    tplText(pad, Math.round(h * 0.1), w - pad * 2, 100, 'FINAL BOSS', { fontSize: Math.round(m(w, h) * 0.1), fontWeight: 900, color: '#e879f9', textAlign: 'center' }, 2, 'Title'),
    tplText(pad, Math.round(h * 0.28), w - pad * 2, 56, 'no-hit run · spoiler free', { fontSize: Math.round(m(w, h) * 0.032), fontWeight: 600, color: '#e9d5ff', textAlign: 'center' }, 3, 'Sub'),
    tplRect(pad, Math.round(h * 0.42), w - pad * 2, Math.round(h * 0.48), 'rgba(15,15,20,0.9)', '#c084fc', 12, 4),
    tplText(pad + 20, Math.round(h * 0.48), w - (pad + 20) * 2, 80, 'Gameplay + commentary', { fontSize: Math.round(m(w, h) * 0.04), fontWeight: 800, color: '#fafafa', textAlign: 'center' }, 5, 'Banner'),
  ];
  return { elements: reindexZ(els), background: '#09090b' };
}

export function buildSlideTitleHero(w: number, h: number) {
  const pad = Math.round(m(w, h) * 0.08);
  const els: SwaggenElement[] = [
    tplRect(0, 0, w, h, 'linear-gradient(120deg, #eff6ff 0%, #ffffff 45%, #eef2ff 100%)', 'transparent', 0, 1),
    tplText(pad, Math.round(h * 0.32), w - pad * 2, 160, 'Quarterly review', { fontSize: Math.round(m(w, h) * 0.08), fontWeight: 800, color: '#1e3a8a', textAlign: 'center', lineHeight: 1.1 }, 2, 'Title'),
    tplText(pad, Math.round(h * 0.52), w - pad * 2, 56, 'Product · Growth · Operations', { fontSize: Math.round(m(w, h) * 0.032), fontWeight: 500, color: '#475569', textAlign: 'center' }, 3, 'Subtitle'),
    tplLine(Math.round(w * 0.35), Math.round(h * 0.62), Math.round(w * 0.3), 4, '#6366f1', 4, 4),
  ];
  return { elements: reindexZ(els), background: '#ffffff' };
}

export function buildSlideThreeColumns(w: number, h: number) {
  const pad = Math.round(m(w, h) * 0.06);
  const col = (w - pad * 4) / 3;
  const els: SwaggenElement[] = [
    tplRect(0, 0, w, h, '#ffffff', 'transparent', 0, 1),
    tplText(pad, pad, w - pad * 2, 64, 'Why teams choose us', { fontSize: Math.round(m(w, h) * 0.045), fontWeight: 800, color: '#0f172a', textAlign: 'center' }, 2, 'Title'),
    ...[0, 1, 2].map(i => {
      const x = pad + i * (col + pad / 2);
      return tplRect(x, Math.round(h * 0.22), col, Math.round(h * 0.62), '#f8fafc', '#e2e8f0', 16, 10 + i);
    }),
    ...['Fast', 'Secure', 'Global'].map((label, i) => {
      const x = pad + i * (col + pad / 2);
      return tplText(x + 16, Math.round(h * 0.42), col - 32, 56, label, { fontSize: Math.round(m(w, h) * 0.04), fontWeight: 800, color: '#1e293b', textAlign: 'center' }, 20 + i, label);
    }),
  ];
  return { elements: reindexZ(els), background: '#ffffff' };
}

export function buildSlideTimeline(w: number, h: number) {
  const pad = Math.round(m(w, h) * 0.08);
  const els: SwaggenElement[] = [
    tplRect(0, 0, w, h, '#fafafa', 'transparent', 0, 1),
    tplText(pad, pad, w - pad * 2, 56, 'Roadmap 2026', { fontSize: Math.round(m(w, h) * 0.045), fontWeight: 800, color: '#18181b' }, 2, 'Title'),
    tplLine(pad, Math.round(h * 0.42), w - pad * 2, 6, '#cbd5e1', 4, 3),
    ...[0, 1, 2, 3].map(i => {
      const x = pad + (i * (w - pad * 2)) / 4 + 20;
      return tplEllipse(x, Math.round(h * 0.38), 28, 28, '#3b82f6', 'transparent', 2, 10 + i);
    }),
    ...['Q1', 'Q2', 'Q3', 'Q4'].map((q, i) => {
      const x = pad + (i * (w - pad * 2)) / 4 + 8;
      return tplText(x, Math.round(h * 0.52), (w - pad * 2) / 4 - 16, 40, q, { fontSize: 22, fontWeight: 800, color: '#1e293b', textAlign: 'center' }, 20 + i, q);
    }),
  ];
  return { elements: reindexZ(els), background: '#fafafa' };
}

export function buildFlyerCafe(w: number, h: number) {
  const pad = Math.round(m(w, h) * 0.06);
  const els: SwaggenElement[] = [
    tplImage(0, 0, w, Math.round(h * 0.45), PH.cafe, 'cover', 1, 'Interior', 'center 32%'),
    tplRect(
      0,
      Math.round(h * 0.26),
      w,
      Math.round(h * 0.22),
      'linear-gradient(180deg, transparent 0%, rgba(254,243,199,0.98) 100%)',
      'transparent',
      0,
      2,
    ),
    tplRect(0, Math.round(h * 0.4), w, Math.round(h * 0.6), '#fef3c7', 'transparent', 0, 3),
    tplText(pad, Math.round(h * 0.46), w - pad * 2, 80, 'Morning & Co.', { fontSize: Math.round(m(w, h) * 0.055), fontWeight: 900, color: '#451a03' }, 4, 'Name'),
    tplText(pad, Math.round(h * 0.56), w - pad * 2, 120, 'Open daily 7am – 6pm\n42 Oak Street', { fontSize: Math.round(m(w, h) * 0.03), fontWeight: 600, color: '#78350f', lineHeight: 1.35 }, 5, 'Hours'),
    tplRect(pad, Math.round(h * 0.78), w - pad * 2, 4, '#b45309', 'transparent', 0, 6),
  ];
  return { elements: reindexZ(els), background: '#fef3c7' };
}

export function buildPosterConcert(w: number, h: number) {
  const pad = Math.round(m(w, h) * 0.06);
  const photoH = Math.round(h * 0.48);
  const els: SwaggenElement[] = [
    tplRect(0, 0, w, h, '#0c0a09', 'transparent', 0, 1),
    tplImage(
      pad,
      pad,
      w - pad * 2,
      photoH,
      PH.concert,
      'cover',
      2,
      'Crowd',
      'center 35%',
    ),
    tplRect(
      pad,
      pad + Math.round(photoH * 0.38),
      w - pad * 2,
      Math.round(photoH * 0.62),
      'linear-gradient(180deg, rgba(12,10,9,0) 0%, rgba(12,10,9,0.92) 100%)',
      'transparent',
      0,
      3,
    ),
    tplText(pad, Math.round(h * 0.52), w - pad * 2, 120, 'NEON NIGHTS', { fontSize: Math.round(m(w, h) * 0.09), fontWeight: 900, color: '#f9a8d4', textAlign: 'center' }, 4, 'Title'),
    tplText(pad, Math.round(h * 0.66), w - pad * 2, 56, 'AUG 14 · RIVER STAGE · 8PM', { fontSize: Math.round(m(w, h) * 0.032), fontWeight: 700, color: '#f5f5f4', textAlign: 'center' }, 5, 'Meta'),
    tplText(pad, Math.round(h * 0.76), w - pad * 2, 48, 'Tickets: neonnights.fm', { fontSize: Math.round(m(w, h) * 0.026), fontWeight: 500, color: '#e7e5e4', textAlign: 'center' }, 6, 'Tickets'),
  ];
  return { elements: reindexZ(els), background: '#0c0a09' };
}

export function buildRealEstateOpen(w: number, h: number) {
  const pad = Math.round(m(w, h) * 0.05);
  const els: SwaggenElement[] = [
    tplImage(0, 0, w, h, PH.house, 'cover', 1, 'Home', 'center 55%'),
    tplRect(
      0,
      Math.round(h * 0.48),
      w,
      Math.round(h * 0.52),
      'linear-gradient(180deg, transparent 0%, rgba(15,23,42,0.55) 35%, rgba(15,23,42,0.96) 100%)',
      'transparent',
      0,
      2,
    ),
    tplText(pad, Math.round(h * 0.62), w - pad * 2, 100, 'OPEN HOUSE', { fontSize: Math.round(m(w, h) * 0.05), fontWeight: 800, color: '#ffffff' }, 3, 'Label'),
    tplText(pad, Math.round(h * 0.72), w - pad * 2, 80, 'Sun 1–4pm · 128 Maple Ave', { fontSize: Math.round(m(w, h) * 0.032), fontWeight: 600, color: '#f1f5f9' }, 4, 'Details'),
  ];
  return { elements: reindexZ(els), background: '#0f172a' };
}

export function buildA4Letterhead(w: number, h: number) {
  const pad = Math.round(m(w, h) * 0.08);
  const scale = m(w, h);
  const brandSize = Math.max(22, Math.round(scale * 0.026));
  const dateSize = Math.max(15, Math.round(scale * 0.017));
  const bodySize = Math.max(17, Math.round(scale * 0.019));
  const ruleThickness = Math.max(2, Math.round(scale * 0.002));
  const brandBarH = Math.max(7, Math.round(scale * 0.005));
  const brandBarW = Math.min(Math.round(scale * 0.22), 200);
  const companyY = pad + brandBarH + Math.round(scale * 0.022);
  const companyH = Math.round(scale * 0.07);
  const els: SwaggenElement[] = [
    tplRect(0, 0, w, h, '#ffffff', 'transparent', 0, 1),
    tplRect(pad, pad, brandBarW, brandBarH, '#1d4ed8', 'transparent', 0, 2),
    tplText(pad, companyY, w - pad * 2, companyH, 'Aurora Partners LLP', {
      fontSize: brandSize,
      fontWeight: 700,
      color: '#0f172a',
      lineHeight: 1.15,
    }, 3, 'Company'),
    tplText(pad, Math.round(h * 0.22), w - pad * 2, Math.round(scale * 0.045), 'March 29, 2026', {
      fontSize: dateSize,
      fontWeight: 600,
      color: '#1e293b',
    }, 4, 'Date'),
    tplLine(pad, Math.round(h * 0.3), w - pad * 2, ruleThickness, '#94a3b8', 2, 5),
    tplText(
      pad,
      Math.round(h * 0.34),
      w - pad * 2,
      Math.round(h * 0.52),
      'Dear client,\n\nThank you for your continued trust. Please find enclosed our summary of next steps…',
      {
        fontSize: bodySize,
        fontWeight: 500,
        color: '#0f172a',
        lineHeight: 1.65,
      },
      6,
      'Body',
    ),
  ];
  return { elements: reindexZ(els), background: '#ffffff' };
}

export function buildA4Certificate(w: number, h: number) {
  const pad = Math.round(m(w, h) * 0.1);
  const base: SwaggenElement[] = [
    tplRect(0, 0, w, h, '#fffbeb', 'transparent', 0, 1),
    tplRect(pad, pad, w - pad * 2, h - pad * 2, 'transparent', '#d97706', 4, 2),
    tplText(pad, Math.round(h * 0.18), w - pad * 2, 56, 'Certificate of Achievement', { fontSize: Math.round(m(w, h) * 0.028), fontWeight: 600, color: '#b45309', textAlign: 'center' }, 3, 'Header'),
    tplText(pad, Math.round(h * 0.32), w - pad * 2, 80, 'Presented to', { fontSize: 20, fontWeight: 500, color: '#92400e', textAlign: 'center' }, 4, 'Line'),
    tplText(pad, Math.round(h * 0.4), w - pad * 2, 100, 'Alex Morgan', { fontSize: Math.round(m(w, h) * 0.055), fontWeight: 800, color: '#78350f', textAlign: 'center' }, 5, 'Name'),
    tplEllipse(Math.round(w / 2 - 48), Math.round(h * 0.62), 96, 96, 'rgba(217, 119, 6, 0.15)', '#d97706', 3, 6),
    tplText(Math.round(w / 2 - 80), Math.round(h * 0.66), 160, 40, 'SEAL', { fontSize: 16, fontWeight: 700, color: '#b45309', textAlign: 'center' }, 7, 'Seal text'),
  ];
  return { elements: reindexZ(base), background: '#fffbeb' };
}

export function buildBusinessCardModern(w: number, h: number) {
  const pad = Math.round(m(w, h) * 0.08);
  const els: SwaggenElement[] = [
    tplRect(0, 0, w, h, '#fafafa', 'transparent', 0, 1),
    tplRect(0, 0, Math.round(w * 0.35), h, '#18181b', 'transparent', 0, 2),
    tplText(pad, Math.round(h * 0.28), Math.round(w * 0.35) - pad, 100, 'AM', { fontSize: Math.round(m(w, h) * 0.14), fontWeight: 900, color: '#fafafa', textAlign: 'center' }, 3, 'Monogram'),
    tplText(Math.round(w * 0.42), Math.round(h * 0.28), Math.round(w * 0.55), 56, 'Alex Morgan', { fontSize: Math.round(m(w, h) * 0.055), fontWeight: 800, color: '#18181b' }, 4, 'Name'),
    tplText(Math.round(w * 0.42), Math.round(h * 0.42), Math.round(w * 0.55), 40, 'Product Design Lead', { fontSize: Math.round(m(w, h) * 0.032), fontWeight: 500, color: '#52525b' }, 5, 'Title'),
    tplText(Math.round(w * 0.42), Math.round(h * 0.62), Math.round(w * 0.55), 80, 'hello@studio.com\n+1 (555) 010-2030', { fontSize: Math.round(m(w, h) * 0.026), fontWeight: 500, color: '#52525b', lineHeight: 1.4 }, 6, 'Contact'),
  ];
  return { elements: reindexZ(els), background: '#fafafa' };
}

export function buildLogoMarkMinimal(w: number, h: number) {
  const pad = Math.round(m(w, h) * 0.12);
  const els: SwaggenElement[] = [
    tplRect(0, 0, w, h, '#ffffff', 'transparent', 0, 1),
    tplEllipse(pad, pad, h - pad * 2, h - pad * 2, '#4f46e5', 'transparent', 0, 2),
    tplText(Math.round(h * 0.28), Math.round(h * 0.28), h - pad * 2, h - pad * 2, '◆', { fontSize: Math.round(h * 0.35), fontWeight: 700, color: '#fff', textAlign: 'center' }, 3, 'Mark'),
    tplText(Math.round(h + pad * 1.5), Math.round(h * 0.38), w - h - pad * 3, 80, 'NORTH', { fontSize: Math.round(h * 0.16), fontWeight: 900, color: '#18181b' }, 4, 'Word 1'),
    tplText(Math.round(h + pad * 1.5), Math.round(h * 0.56), w - h - pad * 3, 48, 'LAB', { fontSize: Math.round(h * 0.1), fontWeight: 600, color: '#6366f1' }, 5, 'Word 2'),
  ];
  return { elements: reindexZ(els), background: '#ffffff' };
}

export function buildMarketingWebinar(w: number, h: number) {
  const pad = Math.round(m(w, h) * 0.08);
  const els2: SwaggenElement[] = [
    tplRect(0, 0, w, h, 'linear-gradient(135deg, #ecfeff 0%, #f5f3ff 100%)', 'transparent', 0, 1),
    tplText(pad, Math.round(h * 0.1), w - pad * 2, 48, 'FREE LIVE WEBINAR', { fontSize: Math.round(m(w, h) * 0.028), fontWeight: 800, color: '#0e7490' }, 2, 'Eyebrow'),
    tplText(pad, Math.round(h * 0.18), w - pad * 2, 160, 'Scale your API without the chaos', { fontSize: Math.round(m(w, h) * 0.065), fontWeight: 900, color: '#164e63', lineHeight: 1.1 }, 3, 'Title'),
    tplRect(pad, Math.round(h * 0.48), w - pad * 2, 120, '#ffffff', '#a5f3fc', 16, 4),
    tplText(pad + 20, Math.round(h * 0.52), w - (pad + 20) * 2, 80, 'Thu · Apr 9 · 10:00 PT', { fontSize: Math.round(m(w, h) * 0.03), fontWeight: 600, color: '#155e75' }, 5, 'Time'),
    tplEllipse(w - pad - 100, Math.round(h * 0.72), 80, 80, '#22d3ee', 'transparent', 0, 6),
  ];
  return { elements: reindexZ(els2), background: '#ecfeff' };
}

export function buildInstagramMinimalProduct(w: number, h: number) {
  const pad = Math.round(m(w, h) * 0.08);
  const imgH = Math.round(h * 0.58);
  const els: SwaggenElement[] = [
    tplRect(0, 0, w, h, '#fafafa', 'transparent', 0, 1),
    tplImage(pad, pad, w - pad * 2, imgH, PH.hero, 'cover', 2, 'Product', 'center 40%'),
    tplRect(
      pad,
      pad + Math.round(imgH * 0.55),
      w - pad * 2,
      Math.round(imgH * 0.45),
      'linear-gradient(180deg, transparent 0%, rgba(250,250,250,0.95) 100%)',
      'transparent',
      0,
      3,
    ),
    tplText(pad, Math.round(h * 0.69), w - pad * 2, 72, 'Alpine shell jacket', { fontSize: Math.round(m(w, h) * 0.045), fontWeight: 800, color: '#09090b', textAlign: 'center' }, 4, 'Title'),
    tplText(pad, Math.round(h * 0.805), w - pad * 2, 40, 'Waterproof · breathable', { fontSize: Math.round(m(w, h) * 0.026), fontWeight: 500, color: '#52525b', textAlign: 'center' }, 5, 'Sub'),
  ];
  return { elements: reindexZ(els), background: '#fafafa' };
}

export function buildPresentationMetrics(w: number, h: number) {
  const pad = Math.round(m(w, h) * 0.08);
  const bw = (w - pad * 5) / 4;
  const tileTop = Math.round(h * 0.28);
  const tileH = Math.round(h * 0.5);
  const innerW = bw - 16;
  /** Keep KPI value sized to the tile — avoid min(w,h)*0.09 (huge on 16:9 slides vs 80px-tall text boxes). */
  const kpiFont = Math.min(
    56,
    Math.max(22, Math.round(innerW * 0.18)),
    Math.round(tileH * 0.34),
  );
  const kpiTextH = Math.max(48, Math.ceil(kpiFont * 1.2));
  const kpiY = tileTop + Math.max(0, Math.round((tileH - kpiTextH) / 2));

  const els: SwaggenElement[] = [
    tplRect(0, 0, w, h, '#0f172a', 'transparent', 0, 1),
    tplText(pad, pad, w - pad * 2, 56, 'Key metrics', { fontSize: Math.round(m(w, h) * 0.04), fontWeight: 800, color: '#f8fafc' }, 2, 'Title'),
    ...[0, 1, 2, 3].map(i => {
      const x = pad + i * (bw + pad / 2);
      return tplRect(x, tileTop, bw, tileH, '#1e293b', '#334155', 12, 10 + i);
    }),
    ...['98%', '2.4x', '42', '12ms'].map((label, i) => {
      const x = pad + i * (bw + pad / 2);
      return tplText(x + 8, kpiY, innerW, kpiTextH, label, {
        fontSize: kpiFont,
        fontWeight: 900,
        color: '#38bdf8',
        textAlign: 'center',
        lineHeight: 1.15,
      }, 20 + i, `K${i}`);
    }),
  ];
  return { elements: reindexZ(els), background: '#0f172a' };
}

export function buildSeasonalHoliday(w: number, h: number) {
  const pad = Math.round(m(w, h) * 0.08);
  const els: SwaggenElement[] = [
    tplRect(0, 0, w, h, 'linear-gradient(180deg, #14532d 0%, #166534 100%)', 'transparent', 0, 1),
    tplText(pad, Math.round(h * 0.2), w - pad * 2, 100, 'Happy Holidays', { fontSize: Math.round(m(w, h) * 0.07), fontWeight: 800, color: '#fef3c7', textAlign: 'center' }, 2, 'Greeting'),
    tplText(pad, Math.round(h * 0.36), w - pad * 2, 80, 'Warm wishes from our team to yours', { fontSize: Math.round(m(w, h) * 0.03), fontWeight: 500, color: '#d9f99d', textAlign: 'center', lineHeight: 1.35 }, 3, 'Message'),
    tplEllipse(Math.round(w / 2 - 40), Math.round(h * 0.58), 80, 80, '#facc15', 'transparent', 0, 4),
    tplText(Math.round(w / 2 - 24), Math.round(h * 0.62), 48, 40, '★', { fontSize: 36, fontWeight: 700, color: '#fff', textAlign: 'center' }, 5, 'Star'),
  ];
  return { elements: reindexZ(els), background: '#14532d' };
}

export function buildNonprofitAppeal(w: number, h: number) {
  const pad = Math.round(m(w, h) * 0.07);
  const els: SwaggenElement[] = [
    tplImage(0, 0, w, Math.round(h * 0.55), PH.team, 'cover', 1, 'Impact', 'center 30%'),
    tplRect(
      0,
      Math.round(h * 0.3),
      w,
      Math.round(h * 0.28),
      'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.98) 100%)',
      'transparent',
      0,
      2,
    ),
    tplRect(0, Math.round(h * 0.48), w, Math.round(h * 0.52), '#ffffff', 'transparent', 0, 3),
    tplText(pad, Math.round(h * 0.54), w - pad * 2, 100, 'Every gift plants a tree', { fontSize: Math.round(m(w, h) * 0.048), fontWeight: 800, color: '#052e16', lineHeight: 1.15 }, 4, 'Headline'),
    tplRect(pad, Math.round(h * 0.72), 200, 48, '#16a34a', 'transparent', 10, 5),
    tplText(pad + 24, Math.round(h * 0.735), 160, 36, 'Donate', { fontSize: 20, fontWeight: 800, color: '#fff', textAlign: 'center' }, 6, 'CTA'),
  ];
  return { elements: reindexZ(els), background: '#ffffff' };
}

/** Legacy-style layouts (original gallery starters) */
export function buildPurpleBrandQuote(w: number, h: number) {
  const pad = Math.round(m(w, h) * 0.08);
  const els: SwaggenElement[] = [
    tplRect(0, 0, w, h, 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 'transparent', 0, 1),
    tplText(pad, Math.round(h * 0.35), w - pad * 2, Math.round(h * 0.2), 'Design that speaks.', { fontSize: Math.round(m(w, h) * 0.06), fontWeight: 700, color: '#ffffff' }, 2, 'Headline'),
    tplText(pad, Math.round(h * 0.52), w - pad * 2, Math.round(h * 0.15), 'Your brand. Your canvas.', { fontSize: Math.round(m(w, h) * 0.028), fontWeight: 500, color: '#f1f5f9' }, 3, 'Sub'),
  ];
  return { elements: reindexZ(els), background: '#4c1d95' };
}

export function buildSummerLaunchEvent(w: number, h: number) {
  const pad = Math.round(m(w, h) * 0.06);
  const els: SwaggenElement[] = [
    tplRect(pad, pad, w - pad * 2, h - pad * 2, '#0f172a', '#e2e8f0', 24, 1),
    tplRect(pad + 24, pad + 24, w - (pad + 24) * 2, Math.round(h * 0.42), 'linear-gradient(90deg, #38bdf8, #818cf8)', 'transparent', 16, 2),
    tplText(pad + 48, Math.round(h * 0.52), w - (pad + 48) * 2, 120, 'Summer Launch', { fontSize: Math.round(m(w, h) * 0.055), fontWeight: 800, color: '#f8fafc' }, 3, 'Title'),
    tplText(pad + 48, Math.round(h * 0.62), w - (pad + 48) * 2, 80, 'Save the date · RSVP', { fontSize: Math.round(m(w, h) * 0.026), fontWeight: 500, color: '#cbd5e1' }, 4, 'Meta'),
  ];
  return { elements: reindexZ(els), background: '#0f172a' };
}

export function buildMinimalTypographic(w: number, h: number) {
  const pad = Math.round(m(w, h) * 0.1);
  const els: SwaggenElement[] = [
    tplRect(0, 0, w, h, '#fafafa', '#e4e4e7', 0, 1),
    tplText(pad, Math.round(h * 0.38), w - pad * 2, 140, 'LESS IS MORE', { fontSize: Math.round(m(w, h) * 0.072), fontWeight: 900, color: '#18181b', textAlign: 'center' }, 2, 'Title'),
    tplText(pad, Math.round(h * 0.52), w - pad * 2, 60, 'Studio collection 2026', { fontSize: Math.round(m(w, h) * 0.024), fontWeight: 500, color: '#3f3f46', textAlign: 'center' }, 3, 'Tag'),
  ];
  return { elements: reindexZ(els), background: '#fafafa' };
}
