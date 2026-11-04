'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface MacScreenProps {
  gifUrl?: string;
  alt?: string;
  className?: string;
  children?: React.ReactNode;
}

export const MacScreen: React.FC<MacScreenProps> = React.memo(({
  gifUrl = '/component-frames/mac-screen-content.gif',
  alt = 'Macintosh Screen',
  className,
  children,
}) => {
  return (
    <div className={cn('relative inline-block select-none pointer-events-none', className)}>
      {/* Mac Computer Frame Image */}
      <img
        alt="Classic Macintosh Computer"
        className="w-full max-w-xs sm:max-w-sm md:max-w-md pointer-events-none drop-shadow-2xl select-none"
        src="/component-frames/apple-computer-img.png"
        loading="eager"
        decoding="sync"
      />

      {/* Screen overlay — all % so it tracks the responsive frame image */}
      <div
        className="absolute overflow-hidden bg-black flex items-center justify-center pointer-events-none"
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
            className="h-full w-full object-cover select-none pointer-events-none"
            src={gifUrl}
            loading="eager"
            decoding="sync"
          />
        )}
      </div>
    </div>
  );
});

MacScreen.displayName = 'MacScreen';

export default MacScreen;
