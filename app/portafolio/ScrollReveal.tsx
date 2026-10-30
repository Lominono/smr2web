'use client';

import { useEffect, useRef, ReactNode } from 'react';

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;          // ms
  direction?: 'up' | 'left' | 'right' | 'none';
  threshold?: number;      // 0–1
  once?: boolean;
}

export function ScrollReveal({
  children,
  className = '',
  delay = 0,
  direction = 'up',
  threshold = 0.12,
  once = true,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Aplica el estado inicial (invisible + offset)
    const initialTransform: Record<typeof direction, string> = {
      up: 'translateY(32px)',
      left: 'translateX(-28px)',
      right: 'translateX(28px)',
      none: 'none',
    };

    el.style.opacity = '0';
    el.style.transform = initialTransform[direction];
    el.style.transition = `opacity 0.55s ease ${delay}ms, transform 0.55s ease ${delay}ms`;

    // Respeta prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.style.opacity = '1';
      el.style.transform = 'none';
      el.style.transition = 'none';
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.opacity = '1';
          el.style.transform = 'none';
          if (once) observer.disconnect();
        } else if (!once) {
          el.style.opacity = '0';
          el.style.transform = initialTransform[direction];
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay, direction, threshold, once]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

// Variante stagger: anima hijos en cascada
interface StaggerProps {
  children: ReactNode;
  className?: string;
  staggerMs?: number;
  direction?: 'up' | 'left' | 'right' | 'none';
  threshold?: number;
}

export function Stagger({
  children,
  className = '',
  staggerMs = 80,
  direction = 'up',
  threshold = 0.1,
}: StaggerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const items = Array.from(container.children) as HTMLElement[];

    const initialTransform: Record<typeof direction, string> = {
      up: 'translateY(28px)',
      left: 'translateX(-24px)',
      right: 'translateX(24px)',
      none: 'none',
    };

    items.forEach((item, i) => {
      item.style.opacity = '0';
      item.style.transform = initialTransform[direction];
      item.style.transition = `opacity 0.5s ease ${i * staggerMs}ms, transform 0.5s ease ${i * staggerMs}ms`;
    });

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          items.forEach((item) => {
            item.style.opacity = '1';
            item.style.transform = 'none';
          });
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [direction, staggerMs, threshold]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
