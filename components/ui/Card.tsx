'use client';

import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'raised' | 'subtle';
  interactive?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, variant = 'default', interactive = false, className = '', ...props }, ref) => {
    const variantStyles = {
      default: 'bg-surface border-border',
      raised: 'bg-surface-raised border-border',
      subtle: 'bg-surface-subtle border-border-subtle',
    }[variant];

    const interactiveStyles = interactive
      ? 'hover:border-zinc-700 hover:bg-surface-raised cursor-pointer transition-colors active:scale-[0.99]'
      : '';

    return (
      <div
        ref={ref}
        className={`border rounded-[var(--radius-lg)] p-4 ${variantStyles} ${interactiveStyles} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
