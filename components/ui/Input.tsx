'use client';

import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftIcon,
      rightElement,
      id,
      className = '',
      type = 'text',
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <div className="w-full space-y-1">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium text-foreground-muted"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 text-foreground-subtle pointer-events-none flex items-center justify-center">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            type={type}
            className={`w-full h-10 px-3 bg-surface border rounded-[var(--radius)] text-sm text-foreground placeholder:text-foreground-subtle transition-colors focus:outline-none focus:border-border-focus focus:ring-1 focus:ring-border-focus disabled:opacity-40 disabled:cursor-not-allowed ${
              leftIcon ? 'pl-9' : ''
            } ${rightElement ? 'pr-10' : ''} ${
              error ? 'border-danger focus:border-danger focus:ring-danger' : 'border-border'
            } ${className}`}
            {...props}
          />

          {rightElement && (
            <div className="absolute right-2.5 flex items-center">
              {rightElement}
            </div>
          )}
        </div>

        {error && (
          <p className="text-[11px] text-danger font-medium">{error}</p>
        )}
        {hint && !error && (
          <p className="text-[11px] text-foreground-subtle">{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
