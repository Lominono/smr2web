'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface SpeechBubbleProps extends React.ComponentProps<'div'> {
  children: React.ReactNode;
  className?: string;
  showCursor?: boolean;
  tailDirection?: 'right' | 'left';
  variant?: 'light' | 'dark' | 'glass';
}

export function SpeechBubbleRoot({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="speech-bubble"
      className={cn('relative inline-flex mr-6 md:mr-10', className)}
      {...props}
    />
  );
}

export function SpeechBubbleTail({
  className,
  direction = 'right',
  ...props
}: React.ComponentProps<'svg'> & { direction?: 'right' | 'left' }) {
  const isLeft = direction === 'left';
  return (
    <svg
      data-slot="speech-bubble-tail"
      aria-hidden="true"
      className={cn(
        'absolute bottom-0 h-5 w-auto transition-colors md:h-7 pointer-events-none',
        isLeft ? 'left-[-12px] -scale-x-100 rotate-5' : 'right-[-12px] -rotate-5',
        className
      )}
      fill="none"
      focusable="false"
      height="45"
      viewBox="0 0 53 45"
      width="53"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        className="fill-current transition-colors"
        d="M44 0H0V0C0 24.8528 20.1472 45 45 45H53V45C47.1396 36.535 44 26.4842 44 16.1886V0Z"
      />
    </svg>
  );
}

export function SpeechBubbleText({
  className,
  ...props
}: React.ComponentProps<'h1'>) {
  return (
    <h1
      data-slot="speech-bubble-text"
      className={cn(
        'relative text-balance font-semibold text-base sm:text-2xl md:text-3xl lg:text-[2rem] leading-[1.05] tracking-[-0.05em]',
        className
      )}
      {...props}
    />
  );
}

export function SpeechBubbleCursor({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="speech-bubble-cursor"
      className={cn(
        'relative ml-2.5 inline-block h-4 w-2 sm:h-6 sm:w-3 animate-pulse bg-neutral-400 align-middle',
        className
      )}
      {...props}
    />
  );
}

export function SpeechBubble({
  children,
  className,
  showCursor = true,
  tailDirection = 'right',
  variant = 'light',
  ...props
}: SpeechBubbleProps) {
  const variantStyles = {
    light: 'bg-white text-black fill-white shadow-[0_8px_30px_rgba(255,255,255,0.12)]',
    dark: 'bg-neutral-900 text-white fill-neutral-900 border border-neutral-800 shadow-2xl',
    glass: 'bg-neutral-900/90 text-white fill-neutral-900/90 backdrop-blur-xl border border-white/10 shadow-2xl',
  }[variant];

  return (
    <SpeechBubbleRoot className={className} {...props}>
      <div
        data-slot="speech-bubble-body"
        className={cn(
          'relative flex w-fit items-center rounded-full px-6 py-3.5 sm:px-9 sm:py-5 transition-all duration-300',
          variantStyles
        )}
      >
        <SpeechBubbleTail direction={tailDirection} />
        <SpeechBubbleText className={variant === 'light' ? 'text-black' : 'text-white'}>
          {children}
        </SpeechBubbleText>
        {showCursor ? (
          <SpeechBubbleCursor
            className={variant === 'light' ? 'bg-neutral-400' : 'bg-neutral-500'}
          />
        ) : null}
      </div>
    </SpeechBubbleRoot>
  );
}
