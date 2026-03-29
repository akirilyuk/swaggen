import type { UIComponentTemplate } from '@/types/project';
import type { ComponentSettingDef } from './renderers/types';

import {
  // Basic HTML elements
  HeaderTextSettings,
  ParagraphSettings,
  LinkSettings,
  ImageSettings,
  ButtonSettings,
  DividerSettings,
  SpacerSettings,
  // Form inputs
  TextInputSettings,
  NumberInputSettings,
  TextAreaSettings,
  SelectDropdownSettings,
  CheckboxSettings,
  DatePickerSettings,
  // Layout & containers
  ContainerSettings,
  CardSettings,
  AlertSettings,
  BadgeSettings,
  // Content
  ListSettings,
  BlockquoteSettings,
  CodeBlockSettings,
  IconSettings,
  // Media
  VideoSettings,
  IframeSettings,
  // Data display
  ResponseViewSettings,
  ListTableSettings,
  DetailCardSettings,
  StatCardSettings,
  FormSettings,
  RelationSettings,
  DefaultSettings,
} from './renderers';

// Re-export types for backward compatibility
export type { ComponentSettingDef, SettingType } from './renderers/types';

/**
 * Per-component settings definitions.
 * Settings are now defined in each renderer file and aggregated here.
 */
export const COMPONENT_SETTINGS: Record<
  UIComponentTemplate,
  ComponentSettingDef[]
> = {
  // Basic HTML elements
  'header-text': HeaderTextSettings,
  paragraph: ParagraphSettings,
  link: LinkSettings,
  image: ImageSettings,
  button: ButtonSettings,
  divider: DividerSettings,
  spacer: SpacerSettings,
  // Form inputs
  'text-input': TextInputSettings,
  'number-input': NumberInputSettings,
  'text-area': TextAreaSettings,
  checkbox: CheckboxSettings,
  'date-picker': DatePickerSettings,
  'select-dropdown': SelectDropdownSettings,
  // Layout & containers
  container: ContainerSettings,
  card: CardSettings,
  alert: AlertSettings,
  badge: BadgeSettings,
  // Content
  list: ListSettings,
  blockquote: BlockquoteSettings,
  'code-block': CodeBlockSettings,
  icon: IconSettings,
  // Media
  video: VideoSettings,
  iframe: IframeSettings,
  // Data display
  'response-view': ResponseViewSettings,
  'list-table': ListTableSettings,
  'detail-card': DetailCardSettings,
  'stat-card': StatCardSettings,
  'entity-form': FormSettings,
  relation: RelationSettings,
  custom: DefaultSettings,
};
