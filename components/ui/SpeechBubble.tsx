'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface SpeechBubbleProps extends React.ComponentProps<'div'> {
  children: React.ReactNode;
  className?: string;
  showCursor?: boolean;
  variant?: 'light' | 'dark';
}

export function SpeechBubbleRoot({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="speech-bubble"
      className={cn('relative inline-flex mr-4 sm:mr-6', className)}
      {...props}
    />
  );
}

export function SpeechBubbleTail({
  className,
  ...props
}: React.ComponentProps<'svg'>) {
  return (
    <svg
      data-slot="speech-bubble-tail"
      aria-hidden="true"
      className={cn(
        'absolute right-[-14px] bottom-0 h-5 sm:h-6 -rotate-6 pointer-events-none fill-current select-none',
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
        d="M44 0H0V0C0 24.8528 20.1472 45 45 45H53V45C47.1396 36.535 44 26.4842 44 16.1886V0Z"
      />
    </svg>
  );
}

export function SpeechBubbleText({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="speech-bubble-text"
      className={cn(
        'relative text-balance font-semibold text-base sm:text-2xl md:text-3xl leading-[1.1] tracking-[-0.04em]',
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
        'relative ml-2 inline-block h-4 w-1.5 sm:h-5 sm:w-2 animate-pulse bg-neutral-400 align-middle',
        className
      )}
      {...props}
    />
  );
}

export function SpeechBubble({
  children,
  className,
  showCursor = false,
  variant = 'light',
  ...props
}: SpeechBubbleProps) {
  const isLight = variant === 'light';

  return (
    <SpeechBubbleRoot className={className} {...props}>
      <div
        data-slot="speech-bubble-body"
        className={cn(
          'relative flex w-fit items-center rounded-[2rem] sm:rounded-full px-6 py-3.5 sm:px-9 sm:py-5 transition-all duration-300',
          isLight
            ? 'bg-white text-neutral-950 fill-white border border-neutral-200/90 shadow-[0_12px_36px_-6px_rgba(0,0,0,0.12)]'
            : 'bg-neutral-900 text-neutral-100 fill-neutral-900 border border-neutral-800 shadow-[0_16px_40px_-6px_rgba(0,0,0,0.6)]'
        )}
      >
        <SpeechBubbleTail className={isLight ? 'text-white' : 'text-neutral-900'} />
        <SpeechBubbleText className={isLight ? 'text-neutral-950' : 'text-neutral-100'}>
          {children}
        </SpeechBubbleText>
        {showCursor && (
          <SpeechBubbleCursor className={isLight ? 'bg-neutral-400' : 'bg-neutral-500'} />
        )}
      </div>
    </SpeechBubbleRoot>
  );
}

export default SpeechBubble;
