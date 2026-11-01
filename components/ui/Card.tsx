'use client';

import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'raised' | 'subtle';
  interactive?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, variant = 'default', interactive = false, className = '', ...props }, ref) => {
    const variantStyles = {
      default: 'bg-surface border-border shadow-xs',
      raised: 'bg-surface-raised border-border shadow-xs',
      subtle: 'bg-surface-raised/60 border-border-subtle',
    }[variant];

    const interactiveStyles = interactive
      ? 'hover:border-foreground/20 hover:bg-surface-raised cursor-pointer transition-all active:scale-[0.99] touch-manipulation'
      : '';

    return (
      <div
        ref={ref}
        className={`border rounded-[var(--radius-lg)] p-4 sm:p-5 ${variantStyles} ${interactiveStyles} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
