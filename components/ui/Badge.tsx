'use client';

import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'accent' | 'success' | 'danger' | 'outline';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  ...props
}) => {
  const sizeStyles = {
    sm: 'text-[10px] px-1.5 py-0.5 rounded-[var(--radius-sm)]',
    md: 'text-xs px-2 py-0.5 rounded-[var(--radius-sm)]',
  }[size];

  const variantStyles = {
    default: 'bg-surface-raised text-foreground-muted border border-border',
    accent: 'bg-accent-subtle text-accent border border-accent/20 font-medium',
    success: 'bg-success-subtle text-success border border-success/20 font-medium',
    danger: 'bg-danger-subtle text-danger border border-danger/20 font-medium',
    outline: 'bg-transparent text-foreground-muted border border-border',
  }[variant];

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono leading-none ${sizeStyles} ${variantStyles} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
