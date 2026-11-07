import React from 'react';

export default function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const colors: Record<string, string> = {
    beginner: 'bg-success/15 text-success border-success/40',
    intermediate: 'bg-warn/15 text-warn border-warn/40',
    advanced: 'bg-danger/15 text-danger border-danger/40',
  };
  
  const defaultColor = 'bg-surface-2 text-content border-border';
  
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colors[difficulty.toLowerCase()] || defaultColor} capitalize`}>
      {difficulty}
    </span>
  );
}
