'use client';

import type { UIComponent, Entity, UIComponentTemplate } from '@/types/project';
import type { BaseRendererProps } from './renderers/types';

// Form inputs
import { CheckboxRenderer } from './renderers/CheckboxRenderer';
import { DatePickerRenderer } from './renderers/DatePickerRenderer';
import { NumberInputRenderer } from './renderers/NumberInputRenderer';
import { SelectDropdownRenderer } from './renderers/SelectDropdownRenderer';
import { TextAreaRenderer } from './renderers/TextAreaRenderer';
import { TextInputRenderer } from './renderers/TextInputRenderer';

// Data display
import { DefaultRenderer } from './renderers/DefaultRenderer';
import { DetailCardRenderer } from './renderers/DetailCardRenderer';
import { FormRenderer } from './renderers/FormRenderer';
import { ListTableRenderer } from './renderers/ListTableRenderer';
import { RelationRenderer } from './renderers/RelationRenderer';
import { ResponseViewRenderer } from './renderers/ResponseViewRenderer';
import { StatCardRenderer } from './renderers/StatCardRenderer';

// Basic HTML elements
import { AlertRenderer } from './renderers/AlertRenderer';
import { BadgeRenderer } from './renderers/BadgeRenderer';
import { BlockquoteRenderer } from './renderers/BlockquoteRenderer';
import { ButtonRenderer } from './renderers/ButtonRenderer';
import { CardRenderer } from './renderers/CardRenderer';
import { CodeBlockRenderer } from './renderers/CodeBlockRenderer';
import { ContainerRenderer } from './renderers/ContainerRenderer';
import { DividerRenderer } from './renderers/DividerRenderer';
import { HeaderTextRenderer } from './renderers/HeaderTextRenderer';
import { IconRenderer } from './renderers/IconRenderer';
import { IframeRenderer } from './renderers/IframeRenderer';
import { ImageRenderer } from './renderers/ImageRenderer';
import { LinkRenderer } from './renderers/LinkRenderer';
import { ListRenderer } from './renderers/ListRenderer';
import { ParagraphRenderer } from './renderers/ParagraphRenderer';
import { SpacerRenderer } from './renderers/SpacerRenderer';
import { VideoRenderer } from './renderers/VideoRenderer';

/* ------------------------------------------------------------------ */
/*  Template → Renderer mapping                                        */
/* ------------------------------------------------------------------ */

type RendererComponent = React.ComponentType<BaseRendererProps>;

const RENDERERS: Partial<Record<UIComponentTemplate, RendererComponent>> = {
  // Basic HTML elements
  'header-text': HeaderTextRenderer,
  paragraph: ParagraphRenderer,
  link: LinkRenderer,
  image: ImageRenderer,
  button: ButtonRenderer,
  divider: DividerRenderer,
  spacer: SpacerRenderer,

  // Form inputs
  'text-input': TextInputRenderer,
  'number-input': NumberInputRenderer,
  'text-area': TextAreaRenderer,
  'select-dropdown': SelectDropdownRenderer,
  checkbox: CheckboxRenderer,
  'date-picker': DatePickerRenderer,

  // Layout & containers
  container: ContainerRenderer,
  card: CardRenderer,
  alert: AlertRenderer,
  badge: BadgeRenderer,

  // Content
  list: ListRenderer,
  blockquote: BlockquoteRenderer,
  'code-block': CodeBlockRenderer,
  icon: IconRenderer,

  // Media
  video: VideoRenderer,
  iframe: IframeRenderer,

  // Data display
  'response-view': ResponseViewRenderer,
  'list-table': ListTableRenderer,
  'detail-card': DetailCardRenderer,
  'stat-card': StatCardRenderer,
  'entity-form': FormRenderer,
  relation: RelationRenderer,
};

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

interface ComponentRendererProps {
  component: UIComponent;
  entities?: Entity[];
  /** All components on the page — needed by button actions to collect linked inputs */
  siblingComponents?: UIComponent[];
  editable?: boolean;
  onTitleChange?: (title: string) => void;
  /** Called when the input value changes (for input components) */
  onValueChange?: (value: string) => void;
}

/**
 * Thin dispatcher that resolves the correct renderer for a UIComponent template.
 * Each template has its own dedicated file under `./renderers/`.
 */
export function ComponentRenderer({
  component,
  entities = [],
  siblingComponents = [],
  editable = false,
  onTitleChange,
  onValueChange,
}: ComponentRendererProps) {
  const Renderer = RENDERERS[component.template] ?? DefaultRenderer;

  return (
    <Renderer
      component={component}
      entities={entities}
      siblingComponents={siblingComponents}
      editable={editable}
      onTitleChange={onTitleChange}
      onValueChange={onValueChange}
    />
  );
}
