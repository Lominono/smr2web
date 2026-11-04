import * as React from 'react';
import { cn } from '@/lib/utils';

export const MinimalCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'rounded-[24px] bg-neutral-900/60 p-4 sm:p-6 no-underline backdrop-blur-md transition-colors',
      'border border-neutral-800/80',
      'shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_0_0_1px_rgba(255,255,255,0.02)_inset,0_8px_24px_rgba(0,0,0,0.4)]',
      className
    )}
    {...props}
  >
    {children}
  </div>
));
MinimalCard.displayName = 'MinimalCard';

export const MinimalCardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('text-sm font-semibold tracking-tight text-neutral-200', className)}
    {...props}
  />
));
MinimalCardTitle.displayName = 'MinimalCardTitle';

export const MinimalCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-xs text-neutral-500 font-mono', className)}
    {...props}
  />
));
MinimalCardDescription.displayName = 'MinimalCardDescription';

export default MinimalCard;
