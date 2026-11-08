import React from 'react';
import { motion } from 'framer-motion';
import { CountUp, PulseBadge, cn } from '../fx';

/** 7-day trend sparkline — raw SVG, drawn once on data change. */
export const Sparkline: React.FC<{ values: number[]; className?: string }> = ({ values, className }) => {
  if (values.length < 2) return null;
  const max = Math.max(1, ...values);
  const W = 84;
  const H = 26;
  const step = W / (values.length - 1);
  const points = values.map((v, i) => `${i * step},${H - (v / max) * (H - 4) - 2}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={cn('h-6 w-[84px]', className)} aria-hidden="true">
      <polyline points={points} fill="none" stroke="rgb(var(--c-primary))" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      <polyline points={`0,${H} ${points} ${W},${H}`} fill="rgb(var(--c-primary)/0.12)" stroke="none" />
    </svg>
  );
};

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sub?: string;
  sparkValues?: number[];
  liveBadge?: 'success' | 'warn' | 'primary' | null;
  accent?: string;
}

/** Admin KPI card with CountUp, optional sparkline + live badge. */
const StatCard: React.FC<StatCardProps> = ({ icon, label, value, sub, sparkValues, liveBadge, accent }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35 }}
    className="relative overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-card"
  >
    <div className="flex items-start justify-between gap-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary" aria-hidden>
        {icon}
      </span>
      {liveBadge && <PulseBadge tone={liveBadge}>{liveBadge === 'success' ? 'Live' : 'Active'}</PulseBadge>}
    </div>
    <p className="mt-3 text-sm font-bold uppercase tracking-wider text-muted">{label}</p>
    <div className="mt-1 flex items-end justify-between gap-2">
      {typeof value === 'number' ? (
        <CountUp value={value} className={cn('font-display text-3xl font-black tabular-nums', accent ?? 'text-content')} />
      ) : (
        <span className={cn('truncate font-display text-xl font-black', accent ?? 'text-content')} title={String(value)}>{value}</span>
      )}
      {sparkValues && sparkValues.length >= 2 && <Sparkline values={sparkValues} />}
    </div>
    {sub && <p className="mt-1 text-xs font-semibold text-muted">{sub}</p>}
  </motion.div>
);

export default StatCard;
