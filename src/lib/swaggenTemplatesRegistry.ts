import type { SwaggenElement } from '@/types/swaggenCanvas';

import { ARTBOARD_PRESETS } from '@/lib/swaggenPresets';
import type { SwaggenLayoutTemplatePreview } from '@/lib/swaggenTemplatePreview';

import * as B from '@/lib/swaggenTemplateBuilds';

export interface SwaggenLayoutTemplateCategory {
  id: string;
  name: string;
  description: string;
}

export interface SwaggenLayoutTemplateDefinition {
  id: string;
  /**
   * Canva-style label (common formats users search for on canva.com).
   * Designs are original; names reflect familiar categories only.
   */
  name: string;
  description: string;
  categoryId: string;
  presetId: string;
  tags: string[];
  /** Abstract thumbnail for the template browser */
  preview: SwaggenLayoutTemplatePreview;
  /** Surfaced at the top of the gallery */
  featured?: boolean;
  build: (w: number, h: number) => {
    elements: SwaggenElement[];
    background?: string;
  };
}

export const SWAGGEN_LAYOUT_TEMPLATE_CATEGORIES: SwaggenLayoutTemplateCategory[] = [
  {
    id: 'social-instagram',
    name: 'Instagram',
    description: 'Posts & square feed graphics',
  },
  {
    id: 'social-stories',
    name: 'Stories & Reels',
    description: 'Vertical 9:16',
  },
  {
    id: 'social-wide',
    name: 'Facebook & LinkedIn',
    description: 'Landscape link previews',
  },
  {
    id: 'pinterest',
    name: 'Pinterest',
    description: 'Tall pins',
  },
  {
    id: 'social-x',
    name: 'X (Twitter)',
    description: 'In-feed cards',
  },
  {
    id: 'video',
    name: 'YouTube',
    description: 'Thumbnails',
  },
  {
    id: 'presentations',
    name: 'Presentations',
    description: 'Slides & decks',
  },
  {
    id: 'marketing',
    name: 'Marketing & print',
    description: 'Flyers, posters, seasonal',
  },
  {
    id: 'documents',
    name: 'Documents',
    description: 'Letters & certificates',
  },
  {
    id: 'business-brand',
    name: 'Business & logo',
    description: 'Cards, logos, webinars',
  },
];

export const SWAGGEN_LAYOUT_TEMPLATES: SwaggenLayoutTemplateDefinition[] = [
  {
    id: 'ig-purple-brand',
    categoryId: 'social-instagram',
    presetId: 'ig-square',
    name: 'Instagram Post — Gradient quote',
    description: 'Bold gradient with headline (popular quote style)',
    tags: ['instagram', 'quote', 'brand'],
    featured: true,
    preview: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      layout: 'gradient',
      thumb: { primary: 'Quote card', secondary: 'Bold gradient' },
    },
    build: B.buildPurpleBrandQuote,
  },
  {
    id: 'ig-flash-sale',
    categoryId: 'social-instagram',
    presetId: 'ig-square',
    name: 'Instagram Post — Flash sale',
    description: 'Promo, discount code block (retail / e‑commerce)',
    tags: ['instagram', 'sale', 'promo'],
    featured: true,
    preview: {
      background: 'linear-gradient(145deg, #f59e0b 0%, #ef4444 55%, #be123c 100%)',
      layout: 'gradient',
      thumb: { primary: 'FLASH SALE', secondary: 'Code + promo block' },
    },
    build: B.buildIgGradientSale,
  },
  {
    id: 'ig-soft-quote',
    categoryId: 'social-instagram',
    presetId: 'ig-square',
    name: 'Instagram Post — Soft aesthetic',
    description: 'Pastel quote card (lifestyle / creator)',
    tags: ['instagram', 'quote', 'aesthetic'],
    preview: {
      background: 'linear-gradient(180deg, #fdf2f8 0%, #fce7f3 100%)',
      layout: 'minimal',
      thumb: { primary: 'Soft quote', secondary: 'Pastel aesthetic' },
    },
    build: B.buildIgQuoteSoft,
  },
  {
    id: 'ig-food-menu',
    categoryId: 'social-instagram',
    presetId: 'ig-square',
    name: 'Instagram Post — Food & drink',
    description: 'Photo strip + menu headline (restaurants)',
    tags: ['instagram', 'food', 'restaurant'],
    preview: {
      background: '#1c1917',
      layout: 'photoTop',
      thumb: { primary: 'Food & drink', secondary: 'Menu headline' },
    },
    build: B.buildIgFoodAnnouncement,
  },
  {
    id: 'ig-tips-list',
    categoryId: 'social-instagram',
    presetId: 'ig-square',
    name: 'Instagram Post — Tips carousel',
    description: 'Numbered list on gradient (educational carousels)',
    tags: ['instagram', 'education', 'carousel'],
    preview: {
      background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)',
      layout: 'gradient',
      thumb: { primary: 'Tips carousel', secondary: 'Numbered list' },
    },
    build: B.buildIgTipsCarousel,
  },
  {
    id: 'ig-minimal-product',
    categoryId: 'social-instagram',
    presetId: 'ig-square',
    name: 'Instagram Post — Product shot',
    description: 'Clean ecommerce-style product layout',
    tags: ['instagram', 'product', 'shop'],
    preview: {
      background: '#fafafa',
      layout: 'photoTop',
      thumb: { primary: 'Product shot', secondary: 'Clean ecommerce' },
    },
    build: B.buildInstagramMinimalProduct,
  },
  {
    id: 'event-summer-launch',
    categoryId: 'social-instagram',
    presetId: 'ig-square',
    name: 'Instagram Post — Event invite',
    description: 'Framed card + gradient header (RSVP style)',
    tags: ['instagram', 'event', 'invite'],
    preview: {
      background: '#0f172a',
      layout: 'darkPanel',
      thumb: { primary: 'Event invite', secondary: 'RSVP + date' },
    },
    build: B.buildSummerLaunchEvent,
  },
  {
    id: 'story-poll',
    categoryId: 'social-stories',
    presetId: 'ig-story',
    name: 'Instagram Story — Poll',
    description: 'Two stacked choices (interactive story)',
    tags: ['story', 'poll', 'instagram'],
    featured: true,
    preview: {
      background: 'linear-gradient(180deg, #312e81 0%, #1e1b4b 100%)',
      layout: 'pollStack',
      thumb: { primary: 'Poll', secondary: 'Two choices' },
    },
    build: B.buildStoryPoll,
  },
  {
    id: 'story-product-drop',
    categoryId: 'social-stories',
    presetId: 'ig-story',
    name: 'Instagram Story — Product launch',
    description: 'Hero image + launch copy',
    tags: ['story', 'product', 'launch'],
    preview: {
      background: 'linear-gradient(180deg, #6366f1 0%, #fafafa 45%)',
      layout: 'photoTop',
      thumb: { primary: 'Product drop', secondary: 'Launch story' },
    },
    build: B.buildStoryProductDrop,
  },
  {
    id: 'fb-corporate',
    categoryId: 'social-wide',
    presetId: 'social-wide',
    name: 'Facebook Post — Corporate banner',
    description: 'Header bar + headline + CTA (page posts)',
    tags: ['facebook', 'business', 'banner'],
    featured: true,
    preview: {
      background: '#f8fafc',
      layout: 'splitTopBar',
      thumb: { primary: 'Corporate post', secondary: 'Header + CTA' },
    },
    build: B.buildFacebookCorporate,
  },
  {
    id: 'li-hiring',
    categoryId: 'social-wide',
    presetId: 'social-wide',
    name: 'LinkedIn Post — Hiring',
    description: 'Team photo + role + apply link',
    tags: ['linkedin', 'hiring', 'recruiting'],
    preview: {
      background: 'linear-gradient(180deg, #e0f2fe 0%, #f0f9ff 100%)',
      layout: 'photoTop',
      thumb: { primary: "We're hiring", secondary: 'Role + apply' },
    },
    build: B.buildLinkedInHiring,
  },
  {
    id: 'pin-recipe',
    categoryId: 'pinterest',
    presetId: 'pinterest-pin',
    name: 'Pinterest Pin — Recipe',
    description: 'Tall pin with food + long headline',
    tags: ['pinterest', 'recipe', 'food'],
    preview: {
      background: '#fffbeb',
      layout: 'photoTop',
      thumb: { primary: 'Recipe pin', secondary: 'Tall headline' },
    },
    build: B.buildPinterestRecipe,
  },
  {
    id: 'x-breaking-news',
    categoryId: 'social-x',
    presetId: 'twitter-post',
    name: 'X Post — News / announcement',
    description: 'Dark card with headline + link cue',
    tags: ['twitter', 'x', 'news'],
    preview: {
      background: '#0f1419',
      layout: 'minimal',
      minimalOn: 'dark',
      thumb: { primary: 'Breaking news', secondary: 'Headline + link' },
    },
    build: B.buildTwitterNews,
  },
  {
    id: 'yt-creator-split',
    categoryId: 'video',
    presetId: 'youtube',
    name: 'YouTube Thumbnail — Creator split',
    description: 'Face / subject left + title + sticker',
    tags: ['youtube', 'thumbnail', 'creator'],
    featured: true,
    preview: {
      background: '#18181b',
      layout: 'splitLeft',
      thumb: { primary: 'BIG TITLE', secondary: 'Face + sticker' },
    },
    build: B.buildYoutubeBold,
  },
  {
    id: 'yt-gaming',
    categoryId: 'video',
    presetId: 'youtube',
    name: 'YouTube Thumbnail — Gaming',
    description: 'Neon dark frame for gameplay',
    tags: ['youtube', 'gaming', 'stream'],
    preview: {
      background: 'linear-gradient(135deg, #09090b 0%, #3b0764 50%, #09090b 100%)',
      layout: 'darkPanel',
      thumb: { primary: 'LIVE', secondary: 'Neon gameplay' },
    },
    build: B.buildYoutubeGaming,
  },
  {
    id: 'slide-hero-title',
    categoryId: 'presentations',
    presetId: 'presentation',
    name: 'Presentation — Title slide',
    description: 'Centered title + subtitle (deck opener)',
    tags: ['presentation', 'slide', 'title'],
    featured: true,
    preview: {
      background: 'linear-gradient(120deg, #eff6ff 0%, #ffffff 45%, #eef2ff 100%)',
      layout: 'minimal',
      thumb: { primary: 'Title slide', secondary: 'Subtitle line' },
    },
    build: B.buildSlideTitleHero,
  },
  {
    id: 'slide-three-pillars',
    categoryId: 'presentations',
    presetId: 'presentation',
    name: 'Presentation — Three pillars',
    description: 'Three feature columns',
    tags: ['presentation', 'features', 'slide'],
    preview: {
      background: '#ffffff',
      layout: 'cardsRow',
      thumb: { primary: 'Three pillars', secondary: 'Feature columns' },
    },
    build: B.buildSlideThreeColumns,
  },
  {
    id: 'slide-roadmap',
    categoryId: 'presentations',
    presetId: 'presentation',
    name: 'Presentation — Roadmap',
    description: 'Quarter timeline',
    tags: ['presentation', 'roadmap', 'timeline'],
    preview: {
      background: '#fafafa',
      layout: 'timeline',
      thumb: { primary: 'Roadmap', secondary: 'Quarters' },
    },
    build: B.buildSlideTimeline,
  },
  {
    id: 'slide-metrics',
    categoryId: 'presentations',
    presetId: 'presentation',
    name: 'Presentation — Metrics',
    description: 'Four KPI tiles',
    tags: ['presentation', 'kpi', 'data'],
    preview: {
      background: '#0f172a',
      layout: 'kpiRow',
      thumb: { primary: 'Metrics', secondary: 'Four KPI tiles' },
    },
    build: B.buildPresentationMetrics,
  },
  {
    id: 'slide-4-3-welcome',
    categoryId: 'presentations',
    presetId: 'slide-4-3',
    name: 'Presentation — 4:3 title',
    description: 'Classic projector / classroom ratio',
    tags: ['presentation', '4:3', 'education'],
    preview: {
      background: 'linear-gradient(120deg, #eff6ff 0%, #ffffff 50%)',
      layout: 'minimal',
      thumb: { primary: 'Welcome', secondary: '4:3 title' },
    },
    build: B.buildSlideTitleHero,
  },
  {
    id: 'flyer-cafe',
    categoryId: 'marketing',
    presetId: 'a4',
    name: 'Flyer — Café & hospitality',
    description: 'Photo + hours + location (A4)',
    tags: ['flyer', 'cafe', 'print'],
    featured: true,
    preview: {
      background: '#fef3c7',
      layout: 'photoTop',
      thumb: { primary: 'Café flyer', secondary: 'Hours + address' },
    },
    build: B.buildFlyerCafe,
  },
  {
    id: 'poster-concert',
    categoryId: 'marketing',
    presetId: 'a4',
    name: 'Poster — Concert / event',
    description: 'Bold poster with headline + date',
    tags: ['poster', 'music', 'event'],
    preview: {
      background: '#0c0a09',
      layout: 'photoTop',
      thumb: { primary: 'LIVE', secondary: 'Date + venue' },
    },
    build: B.buildPosterConcert,
  },
  {
    id: 'realestate-open',
    categoryId: 'marketing',
    presetId: 'ig-story',
    name: 'Story — Open house',
    description: 'Full-bleed home + overlay',
    tags: ['real estate', 'story'],
    preview: {
      background: 'linear-gradient(180deg, #64748b 0%, #0f172a 100%)',
      layout: 'fullBleedPhoto',
      thumb: { primary: 'Open house', secondary: 'Today 2–4' },
    },
    build: B.buildRealEstateOpen,
  },
  {
    id: 'seasonal-holiday',
    categoryId: 'marketing',
    presetId: 'ig-square',
    name: 'Holiday greeting',
    description: 'Seasonal message card',
    tags: ['holiday', 'greeting', 'seasonal'],
    preview: {
      background: 'linear-gradient(180deg, #14532d 0%, #166534 100%)',
      layout: 'gradient',
      thumb: { primary: 'Seasonal', secondary: 'Warm wishes' },
    },
    build: B.buildSeasonalHoliday,
  },
  {
    id: 'nonprofit-donate',
    categoryId: 'marketing',
    presetId: 'social-wide',
    name: 'Nonprofit — Donation appeal',
    description: 'Impact image + donate CTA',
    tags: ['nonprofit', 'charity', 'cta'],
    preview: {
      background: '#ffffff',
      layout: 'photoTop',
      thumb: { primary: 'Donate', secondary: 'Impact + CTA' },
    },
    build: B.buildNonprofitAppeal,
  },
  {
    id: 'minimal-type-poster',
    categoryId: 'marketing',
    presetId: 'a4',
    name: 'Poster — Minimal type',
    description: 'Swiss-style typography poster',
    tags: ['poster', 'minimal', 'print'],
    preview: {
      background: '#fafafa',
      layout: 'minimal',
      thumb: { primary: 'LESS', secondary: 'IS MORE' },
    },
    build: B.buildMinimalTypographic,
  },
  {
    id: 'doc-letterhead',
    categoryId: 'documents',
    presetId: 'a4',
    name: 'Document — Letterhead',
    description: 'Branded letter (A4)',
    tags: ['letter', 'business', 'a4'],
    featured: true,
    preview: {
      background: '#ffffff',
      layout: 'borderedDoc',
      thumb: { primary: 'Letterhead', secondary: 'Branded A4' },
    },
    build: B.buildA4Letterhead,
  },
  {
    id: 'doc-certificate',
    categoryId: 'documents',
    presetId: 'a4',
    name: 'Document — Certificate',
    description: 'Border + seal area',
    tags: ['certificate', 'award', 'a4'],
    preview: {
      background: '#fffbeb',
      layout: 'borderedDoc',
      thumb: { primary: 'Certificate', secondary: 'Seal + border' },
    },
    build: B.buildA4Certificate,
  },
  {
    id: 'card-business-modern',
    categoryId: 'business-brand',
    presetId: 'business-card',
    name: 'Business card — Modern',
    description: 'Split layout + monogram',
    tags: ['business card', 'contact'],
    preview: {
      background: '#fafafa',
      layout: 'splitLeft',
      thumb: { primary: 'Your name', secondary: 'Title + contact' },
    },
    build: B.buildBusinessCardModern,
  },
  {
    id: 'brand-logo-lockup',
    categoryId: 'business-brand',
    presetId: 'logo-square',
    name: 'Logo — Lockup',
    description: 'Mark + wordmark (square export)',
    tags: ['logo', 'brand'],
    featured: true,
    preview: {
      background: '#ffffff',
      layout: 'minimal',
      thumb: { primary: 'Logo lockup', secondary: 'Mark + wordmark' },
    },
    build: B.buildLogoMarkMinimal,
  },
  {
    id: 'webinar-registration',
    categoryId: 'business-brand',
    presetId: 'presentation',
    name: 'Webinar — Registration',
    description: 'Event title + date + accent',
    tags: ['webinar', 'event', 'b2b'],
    preview: {
      background: 'linear-gradient(135deg, #ecfeff 0%, #f5f3ff 100%)',
      layout: 'gradient',
      thumb: { primary: 'Webinar', secondary: 'Register free' },
    },
    build: B.buildMarketingWebinar,
  },
];

export function getSwaggenLayoutTemplate(
  id: string,
): SwaggenLayoutTemplateDefinition | undefined {
  return SWAGGEN_LAYOUT_TEMPLATES.find(t => t.id === id);
}

export function getTemplatesByCategory(
  categoryId: string,
): SwaggenLayoutTemplateDefinition[] {
  return SWAGGEN_LAYOUT_TEMPLATES.filter(t => t.categoryId === categoryId);
}

export function getPresetDimensionsLabel(presetId: string): string {
  const p = ARTBOARD_PRESETS.find(x => x.id === presetId);
  return p ? `${p.width} × ${p.height}` : '';
}

export function getPresetDisplayName(presetId: string): string {
  const p = ARTBOARD_PRESETS.find(x => x.id === presetId);
  return p?.name ?? presetId;
}
