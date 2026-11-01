'use client';

import React from 'react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center rounded-[var(--radius)] border border-dashed border-border bg-surface/50 space-y-2 ${className}`}
    >
      {icon && (
        <div className="text-foreground-subtle mb-1 flex items-center justify-center">
          {icon}
        </div>
      )}
      <p className="text-xs font-medium text-foreground">{title}</p>
      {description && (
        <p className="text-xs text-foreground-subtle max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
};
