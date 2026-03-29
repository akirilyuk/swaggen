import { Pencil } from 'lucide-react';
import React from 'react';

interface EditableTitleProps {
  value: string;
  editable?: boolean;
  onChange?: (v: string) => void;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  /** Size of the pencil icon */
  iconSize?: number;
  /** Custom class for the pencil icon */
  iconClassName?: string;
  /** Content to render in non-editable mode (defaults to value in a span) */
  children?: React.ReactNode;
}

/** Inline-editable label that falls back to a plain `<span>` when not editing. */
export function EditableTitle({
  value,
  editable,
  onChange,
  className = '',
  inputClassName = '',
  placeholder = 'Click to edit...',
  iconSize = 12,
  iconClassName = '',
  children,
}: EditableTitleProps) {
  if (!editable) {
    return children ? <>{children}</> : <span className={className}>{value}</span>;
  }
  
  const hasCustomBorder = inputClassName.includes('!border');
  const defaultBorderClasses = hasCustomBorder 
    ? '' 
    : 'border-blue-300 dark:border-blue-700 hover:border-blue-400 dark:hover:border-blue-600 focus:border-blue-500';
  
  const defaultIconClasses = iconClassName || 'text-blue-400 dark:text-blue-600';
  
  return (
    <div className={`group/edit relative inline-flex items-center w-full ${className}`}>
      <input
        type="text"
        value={value}
        onChange={e => onChange?.(e.target.value)}
        className={`bg-transparent border-0 border-b-2 border-dashed ${defaultBorderClasses} focus:border-solid focus:outline-none transition-colors w-full pr-6 ${inputClassName}`}
        placeholder={placeholder}
      />
      <Pencil 
        size={iconSize} 
        className={`absolute right-1 ${defaultIconClasses} opacity-60 group-hover/edit:opacity-100 group-focus-within/edit:opacity-100 transition-opacity pointer-events-none flex-shrink-0`}
      />
    </div>
  );
}
