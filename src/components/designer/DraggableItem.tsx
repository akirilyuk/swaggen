'use client';

import { useDraggable } from '@dnd-kit/core';
import { ReactNode } from 'react';

interface DraggableItemProps {
  id: string;
  type: 'template' | 'entity' | 'field';
  data: Record<string, unknown>;
  children: ReactNode;
  className?: string;
}

export function DraggableItem({
  id,
  type,
  data,
  children,
  className = '',
}: DraggableItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id,
      data: {
        type,
        ...data,
      },
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`cursor-grab active:cursor-grabbing ${
        isDragging ? 'opacity-50' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}
