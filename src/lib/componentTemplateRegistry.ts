/**
 * Component Template Registry
 *
 * Central definition of all available UI component templates that can be
 * placed on a page in the designer. Each entry maps a UIComponentTemplate
 * value to a human-readable label and a group for palette organisation.
 *
 * Both the client-side palette (pages/page.tsx) and the server-side
 * API route (api/component-templates) import from here.
 */
import type { UIComponentTemplate } from '@/types/project';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ComponentTemplateEntry {
  /** The template key matching UIComponentTemplate */
  value: UIComponentTemplate;
  /** Human-readable display label */
  label: string;
  /** Palette group for visual categorisation */
  group: string;
  /** Optional short description shown in tooltips */
  description?: string;
}

/* ------------------------------------------------------------------ */
/*  Registry                                                           */
/* ------------------------------------------------------------------ */

export const COMPONENT_TEMPLATE_REGISTRY: ComponentTemplateEntry[] = [
  /* ---- Basic HTML Elements ---- */
  {
    value: 'header-text',
    label: 'Heading',
    group: 'Basic',
    description: 'Heading element (h1–h6)',
  },
  {
    value: 'paragraph',
    label: 'Paragraph',
    group: 'Basic',
    description: 'Block of text',
  },
  {
    value: 'link',
    label: 'Link',
    group: 'Basic',
    description: 'Anchor link to a URL',
  },
  {
    value: 'image',
    label: 'Image',
    group: 'Basic',
    description: 'Image element',
  },
  {
    value: 'button',
    label: 'Button',
    group: 'Basic',
    description:
      'Actions: none, HTTP (REST), or Run Code; optional confirm dialog; link inputs; danger style for delete flows',
  },
  {
    value: 'divider',
    label: 'Divider',
    group: 'Basic',
    description: 'Horizontal rule separator',
  },
  {
    value: 'spacer',
    label: 'Spacer',
    group: 'Basic',
    description: 'Empty vertical space',
  },

  /* ---- Form Inputs ---- */
  {
    value: 'text-input',
    label: 'Text Input',
    group: 'Form',
    description: 'Single-line text field',
  },
  {
    value: 'number-input',
    label: 'Number Input',
    group: 'Form',
    description: 'Numeric input field',
  },
  {
    value: 'text-area',
    label: 'Text Area',
    group: 'Form',
    description: 'Multi-line text input',
  },
  {
    value: 'select-dropdown',
    label: 'Dropdown',
    group: 'Form',
    description: 'Select dropdown with options',
  },
  {
    value: 'checkbox',
    label: 'Checkbox',
    group: 'Form',
    description: 'Boolean checkbox toggle',
  },
  {
    value: 'date-picker',
    label: 'Date Picker',
    group: 'Form',
    description: 'Date selection input',
  },

  /* ---- Layout & Containers ---- */
  {
    value: 'container',
    label: 'Container',
    group: 'Layout',
    description: 'Wrapper div for grouping',
  },
  {
    value: 'card',
    label: 'Card',
    group: 'Layout',
    description: 'Bordered card container',
  },
  {
    value: 'alert',
    label: 'Alert',
    group: 'Layout',
    description: 'Alert / notification box',
  },
  {
    value: 'badge',
    label: 'Badge',
    group: 'Layout',
    description: 'Small badge / tag label',
  },

  /* ---- Content ---- */
  {
    value: 'list',
    label: 'List',
    group: 'Content',
    description: 'Ordered or unordered list',
  },
  {
    value: 'blockquote',
    label: 'Quote',
    group: 'Content',
    description: 'Block quote element',
  },
  {
    value: 'code-block',
    label: 'Code Block',
    group: 'Content',
    description: 'Syntax-highlighted code snippet',
  },
  {
    value: 'icon',
    label: 'Icon',
    group: 'Content',
    description: 'Lucide icon element',
  },

  /* ---- Media ---- */
  {
    value: 'video',
    label: 'Video',
    group: 'Media',
    description: 'Video embed player',
  },
  {
    value: 'iframe',
    label: 'Iframe',
    group: 'Media',
    description: 'Embedded iframe content',
  },

  /* ---- Data Display ---- */
  {
    value: 'response-view',
    label: 'Response View',
    group: 'Data',
    description: 'Shows the result of an API call',
  },
  {
    value: 'stat-card',
    label: 'Stat Card',
    group: 'Data',
    description: 'Summary statistic card',
  },
  {
    value: 'list-table',
    label: 'Data Table',
    group: 'Data',
    description: 'Tabular listing of entity rows',
  },
  {
    value: 'detail-card',
    label: 'Detail Card',
    group: 'Data',
    description: 'Read-only detail view of a record',
  },
  {
    value: 'entity-form',
    label: 'Entity form',
    group: 'Data',
    description: 'Field grid bound to an entity (create, edit, or mixed flows)',
  },
  {
    value: 'relation',
    label: 'Relation',
    group: 'Data',
    description: 'Show related records as a list or as a single-select dropdown',
  },

  /* ---- Other ---- */
  {
    value: 'custom',
    label: 'Custom',
    group: 'Other',
    description: 'Free-form custom component',
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** All unique group names in display order. */
export const TEMPLATE_GROUPS: string[] = [
  ...new Set(COMPONENT_TEMPLATE_REGISTRY.map(t => t.group)),
];

/** Lookup a template entry by its value key. */
export function getTemplateEntry(
  value: UIComponentTemplate,
): ComponentTemplateEntry | undefined {
  return COMPONENT_TEMPLATE_REGISTRY.find(t => t.value === value);
}

/** Get all templates belonging to a given group. */
export function getTemplatesByGroup(group: string): ComponentTemplateEntry[] {
  return COMPONENT_TEMPLATE_REGISTRY.filter(t => t.group === group);
}
