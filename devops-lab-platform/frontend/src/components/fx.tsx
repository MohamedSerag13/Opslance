import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, animate, useInView, useMotionValue, useReducedMotion, useTransform, type Variants, type HTMLMotionProps, type UseInViewOptions } from 'framer-motion';

export { useReducedMotion };

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

/* ============================ Immersive additions ============================
 * FloatingParticles, CountUp, PulseBadge, Typewriter — same house rules as
 * above: token colors only, reduced-motion collapses to a static state, and
 * every canvas/interval cleans up on unmount.
 * --------------------------------------------------------------------------- */


/** Drifting particle field behind hero sections. Purely decorative. */
export const FloatingParticles = ({
  count = 40,
  className,
}: {
  count?: number;
  className?: string;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || reduce) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const primary = getComputedStyle(document.documentElement).getPropertyValue('--c-primary').trim() || '99,102,241';
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--c-accent').trim() || '16,185,129';

    const particles = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 1.5 + Math.random() * 2.5,      // 3–5px dots
      speed: 0.08 + Math.random() * 0.25,
      drift: (Math.random() - 0.5) * 0.15,
      alpha: 0.12 + Math.random() * 0.18,
      tint: Math.random() > 0.5 ? primary : accent,
    }));

    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.y -= p.speed;
        p.x += p.drift;
        if (p.y < -8) {
          p.y = h + 8;
          p.x = Math.random() * w;
        }
        // fade out toward the top
        const fade = Math.min(1, p.y / (h * 0.25));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.tint}, ${(p.alpha * fade).toFixed(3)})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [count, reduce]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className ?? ''}`}
    />
  );
};

/** Counts up from 0 to value over ~1.2s; falls back to static under reduced motion. */
export const CountUp = ({
  value,
  duration = 1.2,
  className,
}: {
  value: number;
  duration?: number;
  className?: string;
}) => {
  const reduce = useReducedMotion();
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.round(v).toLocaleString());
  const [staticText, setStaticText] = useState('0');

  useEffect(() => {
    if (reduce) {
      setStaticText(Math.round(value).toLocaleString());
      return;
    }
    setStaticText('');
    const controls = animate(mv, value, { duration, ease: 'easeOut' });
    return () => controls.stop();
  }, [value, duration, reduce, mv]);

  if (reduce) return <span className={className}>{staticText}</span>;
  return <motion.span className={className}>{rounded}</motion.span>;
};

/** Badge with a living box-shadow pulse — used for streak/live indicators. */
export const PulseBadge = ({
  children,
  tone = 'success',
  className,
}: {
  children: React.ReactNode;
  tone?: 'success' | 'warn' | 'primary';
  className?: string;
}) => {
  const rgb: Record<string, string> = {
    success: 'var(--c-success)',
    warn: 'var(--c-warn)',
    primary: 'var(--c-primary)',
  };
  return (
    <span
      style={{ '--pulse-rgb': rgb[tone] } as React.CSSProperties}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold',
        tone === 'success' && 'border-success/40 bg-success/10 text-success',
        tone === 'warn' && 'border-warn/40 bg-warn/10 text-warn',
        tone === 'primary' && 'border-primary/40 bg-primary/10 text-primary',
        'animate-pulse-badge',
        className,
      )}
    >
      {children}
    </span>
  );
};

/** Types text character by character with a blinking cursor. */
export const Typewriter = ({
  text,
  speed = 55,
  className,
  onDone,
}: {
  text: string;
  speed?: number;
  className?: string;
  onDone?: () => void;
}) => {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? text : '');
  const doneRef = useRef(false);

  useEffect(() => {
    if (reduce) {
      setShown(text);
      if (!doneRef.current) {
        doneRef.current = true;
        onDone?.();
      }
      return;
    }
    setShown('');
    doneRef.current = false;
    let i = 0;
    const timer = setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(timer);
        if (!doneRef.current) {
          doneRef.current = true;
          onDone?.();
        }
      }
    }, speed);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, speed, reduce]);

  const complete = shown.length >= text.length;
  return (
    <span className={className}>
      {shown}
      <span aria-hidden className={`ml-0.5 inline-block w-[2px] ${complete ? 'opacity-0' : 'animate-pulse bg-current'}`}
        style={{ height: '1em', verticalAlign: 'text-bottom' }} />
    </span>
  );
};
