import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/** Scroll-entrance reveal used across landing sections. Honors reduced motion. */
export const Reveal: React.FC<{
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}> = ({ children, delay = 0, y = 24, className = '' }) => {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.55, delay, ease: [0.21, 0.6, 0.35, 1] }}
    >
      {children}
    </motion.div>
  );
};

/** Section heading block with eyebrow label. */
export const SectionHead: React.FC<{ eyebrow: string; title: React.ReactNode; sub?: string; center?: boolean }> = ({
  eyebrow,
  title,
  sub,
  center,
}) => (
  <div className={`${center ? 'mx-auto text-center' : ''} max-w-2xl`}>
    <Reveal>
      <p className="mb-3 inline-block rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary">
        {eyebrow}
      </p>
    </Reveal>
    <Reveal delay={0.05}>
      <h2 className="font-display text-display-md font-bold text-content">{title}</h2>
    </Reveal>
    {sub && (
      <Reveal delay={0.1}>
        <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">{sub}</p>
      </Reveal>
    )}
  </div>
);
