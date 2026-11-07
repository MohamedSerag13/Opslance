import React, { useRef } from 'react';
import { motion, useInView, type Variants, type HTMLMotionProps, type UseInViewOptions } from 'framer-motion';

/**
 * Motion & surface effects — adapted from 21st.dev (Magic UI registry, MIT):
 *   Marquee (dillionverma/marquee), ShineBorder (magicui/shine-border),
 *   BlurFade (magicui/blur-fade), AnimatedGradientText (dillionverma/animated-gradient-text).
 * Adapted to Opslance: no clsx/tailwind-merge dependency, and every color comes
 * from the semantic token variables in index.css so dark/light themes flip
 * correctly (no hardcoded slate/white utilities).
 */

export const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

/* ------------------------------------------------ Marquee (21st.dev) ------ */

export const Marquee = ({
  className,
  reverse = false,
  pauseOnHover = false,
  children,
  vertical = false,
  repeat = 4,
  duration = '40s',
  gap = '1rem',
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  reverse?: boolean;
  pauseOnHover?: boolean;
  vertical?: boolean;
  repeat?: number;
  duration?: string;
  gap?: string;
}) => (
  <div
    {...props}
    style={{ '--duration': duration, '--gap': gap, ...props.style } as React.CSSProperties}
    className={cn(
      'group flex overflow-hidden [gap:var(--gap)]',
      vertical ? 'flex-col' : 'flex-row',
      className,
    )}
  >
    {Array.from({ length: repeat }).map((_, i) => (
      <div
        key={i}
        className={cn(
          'flex shrink-0 justify-around [gap:var(--gap)]',
          vertical ? 'animate-marquee-vertical flex-col' : 'animate-marquee flex-row',
          pauseOnHover && 'group-hover:[animation-play-state:paused]',
          reverse && '[animation-direction:reverse]',
        )}
      >
        {children}
      </div>
    ))}
  </div>
);

/* -------------------------------------------- ShineBorder (21st.dev) ------ */

export const ShineBorder = ({
  borderWidth = 1.5,
  duration = 14,
  shineColor = ['rgb(var(--c-primary))', 'rgb(var(--c-accent))'],
  className,
}: {
  borderWidth?: number;
  duration?: number;
  shineColor?: string | string[];
  className?: string;
}) => (
  <div
    style={
      {
        '--border-width': `${borderWidth}px`,
        '--duration': `${duration}s`,
        backgroundImage: `radial-gradient(transparent, transparent, ${
          Array.isArray(shineColor) ? shineColor.join(', ') : shineColor
        }, transparent, transparent)`,
        backgroundSize: '300% 300%',
        mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        WebkitMaskComposite: 'xor',
        maskComposite: 'exclude',
      } as React.CSSProperties
    }
    className={cn(
      'pointer-events-none absolute inset-0 rounded-[inherit] border-[length:var(--border-width)] animate-shine',
      className,
    )}
  />
);

/* ------------------------------------------------ BlurFade (21st.dev) ----- */

export const BlurFade = ({
  children,
  className,
  duration = 0.5,
  delay = 0,
  yOffset = 6,
  inView = false,
  inViewMargin = '-50px',
  blur = '6px',
  ...props
}: HTMLMotionProps<'div'> & {
  duration?: number;
  delay?: number;
  yOffset?: number;
  inView?: boolean;
  inViewMargin?: string;
  blur?: string;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const inViewResult = useInView(ref, { once: true, margin: inViewMargin as UseInViewOptions['margin'] });  const isInView = !inView || inViewResult;
  const variants: Variants = {
    hidden: { y: yOffset, opacity: 0, filter: `blur(${blur})` },
    visible: { y: -yOffset, opacity: 1, filter: 'blur(0px)' },
  };
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      exit="hidden"
      variants={variants}
      transition={{ delay: 0.04 + delay, duration, ease: 'easeOut' }}
      className={cn(className)}
      {...props}
    >
      {children}
    </motion.div>
  );
};

/* ------------------------- AnimatedGradientText (21st.dev) ---------------- */

export const AnimatedGradientText = ({
  children,
  duration = 8,
  className,
}: {
  children: React.ReactNode;
  duration?: number;
  className?: string;
}) => (
  <div
    style={{ '--bg-duration': `${duration}s` } as React.CSSProperties}
    className={cn(
      'group relative inline-flex items-center rounded-full border border-border bg-surface px-4 py-1.5 shadow-card backdrop-blur',
      className,
    )}
  >
    <span className="inline animate-gradient bg-gradient-to-r from-primary-strong via-accent-soft to-primary-strong bg-[length:300%_100%] bg-clip-text text-sm font-semibold text-transparent">
      {children}
    </span>
  </div>
);
