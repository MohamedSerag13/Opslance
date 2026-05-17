import React from 'react';

export default function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const colors: Record<string, string> = {
    beginner: 'bg-green-100 text-green-800 border-green-200',
    intermediate: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    advanced: 'bg-red-100 text-red-800 border-red-200',
  };
  
  const defaultColor = 'bg-gray-100 text-gray-800 border-gray-200';
  
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colors[difficulty.toLowerCase()] || defaultColor} capitalize`}>
      {difficulty}
    </span>
  );
}
