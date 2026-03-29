import type { Entity, UIComponent } from '@/types/project';

/** Props shared by every component renderer. */
export interface BaseRendererProps {
  component: UIComponent;
  entities: Entity[];
  siblingComponents: UIComponent[];
  editable: boolean;
  onTitleChange?: (title: string) => void;
  /** Called when the input value changes (for input components) */
  onValueChange?: (value: string) => void;
}

/** Setting field types */
export type SettingType = 'select' | 'text' | 'number' | 'toggle' | 'textarea';

/** Definition for a single component setting */
export interface ComponentSettingDef {
  key: string;
  label: string;
  type: SettingType;
  options?: { value: string; label: string }[];
  placeholder?: string;
  defaultValue?: string | number | boolean;
}

/** Helper to read a typed prop with a fallback. */
export function readProp<T>(
  component: UIComponent,
  key: string,
  fallback: T,
): T {
  return (component.props?.[key] as T) ?? fallback;
}

/** Builds field-interpolation helpers from bound fields. */
export function fieldBindingHelpers(boundFields: string[]) {
  const fieldTokens = boundFields.map(f => `{${f}}`);
  const fieldTokensExample = fieldTokens.join(', ');

  const placeholderExample =
    boundFields.length === 1
      ? `e.g. Value is {${boundFields[0]}} here`
      : boundFields.length >= 2
      ? `e.g. {${boundFields[0]}} and {${boundFields[1]}} ...`
      : '';

  const defaultFallback = fieldTokens.join(' · ');

  return {
    fieldTokens,
    fieldTokensExample,
    placeholderExample,
    defaultFallback,
  };
}
