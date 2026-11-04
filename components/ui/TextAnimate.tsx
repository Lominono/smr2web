'use client';

import React, { FC, useRef } from 'react';
import { motion, useInView, Variants, TargetAndTransition, Transition } from 'motion/react';
import { cn } from '@/lib/utils';

export type AnimationType =
  | 'fadeIn'
  | 'fadeInUp'
  | 'popIn'
  | 'shiftInUp'
  | 'rollIn'
  | 'whipIn'
  | 'whipInUp'
  | 'calmInUp';

export interface TextAnimateProps extends React.HTMLAttributes<HTMLElement> {
  text: string;
  type?: AnimationType;
  delay?: number;
  duration?: number;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span' | 'div';
  by?: 'character' | 'word';
  once?: boolean;
  animate?: boolean | 'visible' | 'hidden';
}

const animationVariants: Record<
  AnimationType,
  {
    container: Variants;
    child: Variants;
  }
> = {
  fadeIn: {
    container: {
      hidden: { opacity: 0 },
      visible: (delay: number = 0) => ({
        opacity: 1,
        transition: { staggerChildren: 0.03, delayChildren: delay },
      }),
    },
    child: {
      visible: {
        opacity: 1,
        y: 0,
        transition: {
          type: 'spring',
          damping: 14,
          stiffness: 120,
        },
      },
      hidden: { opacity: 0, y: 8 },
    },
  },
  fadeInUp: {
    container: {
      hidden: { opacity: 0 },
      visible: (delay: number = 0) => ({
        opacity: 1,
        transition: { staggerChildren: 0.04, delayChildren: delay },
      }),
    },
    child: {
      visible: {
        opacity: 1,
        y: 0,
        transition: {
          duration: 0.5,
          ease: [0.16, 1, 0.3, 1],
        },
      },
      hidden: { opacity: 0, y: 16 },
    },
  },
  popIn: {
    container: {
      hidden: { opacity: 0 },
      visible: (delay: number = 0) => ({
        opacity: 1,
        transition: { staggerChildren: 0.03, delayChildren: delay },
      }),
    },
    child: {
      visible: {
        opacity: 1,
        scale: 1,
        transition: { type: 'spring', damping: 16, stiffness: 350 },
      },
      hidden: { opacity: 0, scale: 0.7 },
    },
  },
  calmInUp: {
    container: {
      hidden: {},
      visible: (delay: number = 0) => ({
        transition: { staggerChildren: 0.02, delayChildren: delay },
      }),
    },
    child: {
      hidden: {
        y: '100%',
        opacity: 0,
        transition: {
          ease: [0.455, 0.03, 0.515, 0.955],
          duration: 0.65,
        },
      },
      visible: {
        y: 0,
        opacity: 1,
        transition: {
          ease: [0.125, 0.92, 0.69, 0.975],
          duration: 0.75,
        },
      },
    },
  },
  shiftInUp: {
    container: {
      hidden: {},
      visible: (delay: number = 0) => ({
        transition: { staggerChildren: 0.02, delayChildren: delay },
      }),
    },
    child: {
      hidden: {
        y: '80%',
        opacity: 0,
        transition: {
          ease: [0.75, 0, 0.25, 1],
          duration: 0.45,
        },
      },
      visible: {
        y: 0,
        opacity: 1,
        transition: {
          duration: 0.7,
          ease: [0.22, 1, 0.36, 1],
        },
      },
    },
  },
  whipInUp: {
    container: {
      hidden: {},
      visible: (delay: number = 0) => ({
        transition: { staggerChildren: 0.015, delayChildren: delay },
      }),
    },
    child: {
      hidden: {
        y: '120%',
        opacity: 0,
        transition: {
          ease: [0.455, 0.03, 0.515, 0.955],
          duration: 0.4,
        },
      },
      visible: {
        y: 0,
        opacity: 1,
        transition: {
          ease: [0.5, -0.15, 0.25, 1.05],
          duration: 0.65,
        },
      },
    },
  },
  rollIn: {
    container: {
      hidden: {},
      visible: (delay: number = 0) => ({
        transition: { staggerChildren: 0.03, delayChildren: delay },
      }),
    },
    child: {
      hidden: {
        opacity: 0,
        y: '0.3em',
      },
      visible: {
        opacity: 1,
        y: '0em',
        transition: {
          duration: 0.55,
          ease: [0.65, 0, 0.75, 1],
        },
      },
    },
  },
  whipIn: {
    container: {
      hidden: {},
      visible: (delay: number = 0) => ({
        transition: { staggerChildren: 0.025, delayChildren: delay },
      }),
    },
    child: {
      hidden: {
        opacity: 0,
        y: '0.3em',
      },
      visible: {
        opacity: 1,
        y: '0em',
        transition: {
          duration: 0.45,
          ease: [0.85, 0.1, 0.9, 1.2],
        },
      },
    },
  },
};

export const TextAnimate: FC<TextAnimateProps> = ({
  text,
  type = 'calmInUp',
  delay = 0,
  className,
  as: Component = 'span',
  by = 'character',
  once = true,
  animate: explicitAnimate,
  ...props
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once });

  const activeState =
    explicitAnimate !== undefined
      ? typeof explicitAnimate === 'boolean'
        ? explicitAnimate
          ? 'visible'
          : 'hidden'
        : explicitAnimate
      : isInView
      ? 'visible'
      : 'hidden';

  const { container, child } = animationVariants[type] || animationVariants.calmInUp;
  const MotionComponent = (motion as any)[Component] || motion.span;

  if (by === 'word' || type === 'rollIn' || type === 'whipIn') {
    const words = text.split(' ');
    return (
      <MotionComponent
        ref={ref}
        className={cn('inline-flex flex-wrap overflow-hidden', className)}
        variants={container}
        initial="hidden"
        animate={activeState}
        custom={delay}
        {...props}
      >
        {words.map((word, wIdx) => (
          <motion.span
            key={`${word}-${wIdx}`}
            className="mr-[0.25em] inline-block whitespace-nowrap overflow-hidden align-bottom"
            variants={child}
          >
            {word}
          </motion.span>
        ))}
      </MotionComponent>
    );
  }

  // Descomposición por caracteres (con corrección de alineación vertical para Safari/WebKit)
  const letters = Array.from(text);

  return (
    <MotionComponent
      ref={ref}
      className={cn('inline-flex flex-wrap overflow-hidden leading-tight', className)}
      variants={container}
      initial="hidden"
      animate={activeState}
      custom={delay}
      {...props}
    >
      {letters.map((letter, idx) => (
        <span key={`${letter}-${idx}`} className="overflow-hidden inline-block align-bottom">
          <motion.span
            variants={child}
            className="inline-block"
            style={{ display: 'inline-block' }}
          >
            {letter === ' ' ? '\u00A0' : letter}
          </motion.span>
        </span>
      ))}
    </MotionComponent>
  );
};

export default TextAnimate;
