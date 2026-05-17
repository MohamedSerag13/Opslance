import React from 'react';
import DifficultyBadge from './DifficultyBadge';

interface LabCardProps {
  lab: {
    id: string;
    module_number: number;
    module_title: string;
    title: string;
    difficulty: string;
    estimated_minutes: number;
    points: number;
    status: 'locked' | 'start' | 'done';
    score?: number;
  };
  onClick: () => void;
}

export default function LabCard({ lab, onClick }: LabCardProps) {
  const isLocked = lab.status === 'locked';
  
  return (
    <div 
      onClick={!isLocked ? onClick : undefined}
      className={`p-6 rounded-xl border ${isLocked ? 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-75' : 'bg-white border-gray-200 hover:shadow-lg hover:border-blue-300 cursor-pointer transition-all'}`}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-sm text-gray-500 font-medium mb-1">Module {lab.module_number}: {lab.module_title}</p>
          <h3 className="text-lg font-bold text-gray-900">{lab.title}</h3>
        </div>
        <DifficultyBadge difficulty={lab.difficulty} />
      </div>
      
      <div className="flex gap-4 text-sm text-gray-600 mb-6">
        <span className="flex items-center gap-1">⏱️ {lab.estimated_minutes} min</span>
        <span className="flex items-center gap-1">⭐ {lab.points} pts</span>
      </div>
      
      <div className="border-t pt-4 flex justify-between items-center">
        {isLocked && (
          <span className="text-gray-500 text-sm flex items-center gap-2">
            🔒 Complete previous lab to unlock
          </span>
        )}
        {lab.status === 'start' && (
          <span className="text-blue-600 font-semibold flex items-center gap-2">
            ▶️ Start Lab
          </span>
        )}
        {lab.status === 'done' && (
          <span className="text-green-600 font-semibold flex items-center gap-2">
            ✅ Done (Score: {lab.score})
          </span>
        )}
      </div>
    </div>
  );
}
