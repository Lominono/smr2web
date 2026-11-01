'use client';

import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'secondary',
      size = 'md',
      isLoading = false,
      disabled,
      className = '',
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-150 select-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.97] touch-manipulation';

    const sizeStyles = {
      sm: 'min-h-[44px] sm:min-h-0 sm:h-8 px-3 text-xs rounded-[var(--radius-sm)] gap-1.5',
      md: 'min-h-[44px] sm:min-h-0 sm:h-9 px-3.5 text-xs rounded-[var(--radius)] gap-2',
      lg: 'min-h-[48px] sm:min-h-0 sm:h-11 px-4 text-sm rounded-[var(--radius)] gap-2 font-medium',
    }[size];

    const variantStyles = {
      primary:
        'bg-foreground text-background font-semibold hover:opacity-90 active:opacity-95 border border-transparent shadow-xs',
      secondary:
        'bg-surface-raised text-foreground hover:bg-surface-hover border border-border hover:border-foreground/20',
      ghost:
        'bg-transparent text-foreground-muted hover:text-foreground hover:bg-surface-hover border border-transparent',
      danger:
        'bg-danger-subtle text-danger border border-danger/20 hover:bg-danger/20',
      accent:
        'bg-accent text-accent-foreground font-semibold hover:opacity-90 border border-transparent shadow-xs',
    }[variant];

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
        {...props}
      >
        {isLoading && (
          <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
