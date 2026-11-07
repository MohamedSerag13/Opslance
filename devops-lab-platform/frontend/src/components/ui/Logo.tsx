import React from 'react';

/** Opslance brand mark: terminal prompt inside a rounded hex, gradient stroke. */
export const LogoMark: React.FC<{ size?: number; className?: string }> = ({ size = 32, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="ops-logo-grad" x1="0" y1="0" x2="48" y2="48">
        <stop offset="0%" stopColor="#6366F1" />
        <stop offset="55%" stopColor="#8B5CF6" />
        <stop offset="100%" stopColor="#F97316" />
      </linearGradient>
    </defs>
    <rect x="3" y="3" width="42" height="42" rx="12" stroke="url(#ops-logo-grad)" strokeWidth="3" fill="rgb(var(--c-surface))" />
    <path d="M14 17.5 20.5 24 14 30.5" stroke="url(#ops-logo-grad)" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M24.5 31.5H34" stroke="url(#ops-logo-grad)" strokeWidth="3.4" strokeLinecap="round" />
  </svg>
);

export const Logo: React.FC<{ size?: number; className?: string; wordmark?: boolean }> = ({ size = 32, className = '', wordmark = true }) => (
  <span className={`inline-flex items-center gap-2.5 ${className}`}>
    <LogoMark size={size} />
    {wordmark && (
      <span className="font-display text-lg font-bold tracking-tight text-content">
        Ops<span className="text-gradient">lance</span>
      </span>
    )}
  </span>
);

export default Logo;
