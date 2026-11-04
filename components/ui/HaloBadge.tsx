'use client';

import React from 'react';

export interface HaloBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'cult' | 'amber' | 'subtle';
  size?: 'sm' | 'md' | 'lg';
  live?: boolean;
  glow?: boolean;
  className?: string;
}

const GRADIENTS = {
  // SMR2 Terminal Emerald / Cyan
  default: {
    conic: 'conic-gradient(from 0deg at 50% 50%, #0000 0%, #059669 25%, #10b981 40%, #06b6d4 60%, #0000 100%)',
    underglow: 'radial-gradient(ellipse at center, rgba(16, 185, 129, 0.45), rgba(6, 182, 212, 0.25) 50%, transparent 75%)',
    dotBg: 'bg-emerald-400',
    dotPing: 'bg-emerald-400',
    textGradient: 'from-emerald-300 via-teal-200 to-cyan-300',
  },
  // Signature Cult UI (magenta, purple, cyan, blue)
  cult: {
    conic: 'conic-gradient(from 0deg at 50% 50%, #0000 0%, #ff0080 25%, #7928ca 45%, #00d4ff 70%, #0000 100%)',
    underglow: 'radial-gradient(ellipse at center, rgba(255, 0, 128, 0.4), rgba(121, 40, 202, 0.3) 45%, rgba(0, 212, 255, 0.15) 65%, transparent 80%)',
    dotBg: 'bg-pink-400',
    dotPing: 'bg-pink-400',
    textGradient: 'from-pink-300 via-purple-200 to-cyan-300',
  },
  // Celebratory Amber / Gold
  amber: {
    conic: 'conic-gradient(from 0deg at 50% 50%, #0000 0%, #d97706 25%, #f59e0b 45%, #fbbf24 65%, #0000 100%)',
    underglow: 'radial-gradient(ellipse at center, rgba(245, 158, 11, 0.45), rgba(251, 191, 36, 0.25) 50%, transparent 75%)',
    dotBg: 'bg-amber-400',
    dotPing: 'bg-amber-400',
    textGradient: 'from-amber-200 via-yellow-100 to-amber-300',
  },
  // Minimalist Subtle Silver
  subtle: {
    conic: 'conic-gradient(from 0deg at 50% 50%, #0000 0%, #52525b 30%, #a1a1aa 55%, #e4e4e7 75%, #0000 100%)',
    underglow: 'radial-gradient(ellipse at center, rgba(255, 255, 255, 0.2), rgba(161, 161, 170, 0.1) 50%, transparent 75%)',
    dotBg: 'bg-neutral-300',
    dotPing: 'bg-neutral-400',
    textGradient: 'from-neutral-100 via-neutral-200 to-neutral-400',
  },
};

const SIZES = {
  sm: {
    wrapper: 'h-6 px-2.5 text-[11px] gap-1.5',
    dot: 'w-1.5 h-1.5',
  },
  md: {
    wrapper: 'h-8 px-3.5 text-xs gap-2',
    dot: 'w-2 h-2',
  },
  lg: {
    wrapper: 'h-9 px-4 text-xs sm:text-sm gap-2.5',
    dot: 'w-2.5 h-2.5',
  },
};

export const HaloBadge: React.FC<HaloBadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  live = false,
  glow = true,
  className = '',
  ...props
}) => {
  const currentVariant = GRADIENTS[variant] || GRADIENTS.default;
  const currentSize = SIZES[size] || SIZES.md;

  return (
    <div
      className={`relative inline-flex items-center justify-center group select-none ${className}`}
      {...props}
    >
      {/* 1. Ambient Underglow (Cult UI inspired depth blur) */}
      {glow && (
        <div
          className="absolute -inset-1.5 rounded-full blur-xl pointer-events-none transition-opacity duration-500 opacity-65 group-hover:opacity-90 animate-pulse"
          style={{ background: currentVariant.underglow }}
          aria-hidden="true"
        />
      )}

      {/* 2. Outer Halo Rim with Rotating Conic Gradient */}
      <div className="relative p-[1px] rounded-full overflow-hidden flex items-center justify-center">
        {/* Animated rotating beam */}
        <span
          className="absolute inset-[-200%] animate-[haloRotate_4s_linear_infinite] pointer-events-none"
          style={{ background: currentVariant.conic }}
          aria-hidden="true"
        />

        {/* 3. Frosted Capsule Pill Content */}
        <div
          className={`relative z-10 rounded-full inline-flex items-center font-mono font-medium tracking-tight bg-neutral-950/85 backdrop-blur-xl border border-white/10 shadow-[0_1px_0_rgba(255,255,255,0.15)_inset,0_2px_8px_rgba(0,0,0,0.5)] transition-all duration-300 text-neutral-100 ${currentSize.wrapper}`}
        >
          {/* Live pulsing dot indicator */}
          {live && (
            <span className="relative flex items-center justify-center shrink-0">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${currentVariant.dotPing}`}
              />
              <span
                className={`relative inline-flex rounded-full ${currentSize.dot} ${currentVariant.dotBg}`}
              />
            </span>
          )}

          {/* Badge body with slight gradient highlight */}
          <span className="inline-flex items-center gap-1.5 leading-none">
            {children}
          </span>
        </div>
      </div>
    </div>
  );
};
