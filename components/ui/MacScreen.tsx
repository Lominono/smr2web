'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface MacScreenProps {
  gifUrl?: string;
  alt?: string;
  className?: string;
  children?: React.ReactNode;
}

export function MacScreen({
  gifUrl = '/component-frames/mac-screen-content.gif',
  alt = 'Macintosh Screen',
  className,
  children,
}: MacScreenProps) {
  return (
    <div className={cn('relative inline-block select-none', className)}>
      {/* Mac Computer Frame Image */}
      <img
        alt="Classic Macintosh Computer"
        className="w-full max-w-sm sm:max-w-md md:max-w-lg pointer-events-none drop-shadow-2xl"
        src="/component-frames/apple-computer-img.png"
      />

      {/* Screen overlay — all % so it tracks the responsive frame image */}
      <div
        className="absolute overflow-hidden bg-black flex items-center justify-center"
        style={{
          top: '22.27%',
          left: '35.6%',
          width: '28.79%',
          height: '37.89%',
          borderRadius: '2.5%',
        }}
      >
        {children ? (
          children
        ) : (
          <img
            alt={alt}
            className="h-full w-full object-cover"
            src={gifUrl}
          />
        )}
      </div>
    </div>
  );
}

export default MacScreen;
