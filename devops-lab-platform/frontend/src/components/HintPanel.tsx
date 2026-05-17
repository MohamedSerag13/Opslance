import React, { useState } from 'react';
import { api } from '../api/client';
import { useLabStore } from '../store/labStore';

export default function HintPanel({ sessionId }: { sessionId: string }) {
  const { hintsRevealed, revealHint } = useLabStore();
  const [hints, setHints] = useState<string[]>([]);
  
  const handleReveal = async () => {
    if (hintsRevealed >= 3) return;
    if (!window.confirm(`Reveal Hint ${hintsRevealed + 1}? This will cost 2 points.`)) return;
    
    try {
      const res = await api.post(`/sessions/${sessionId}/hints/${hintsRevealed + 1}`);
      setHints([...hints, res.data.hint]);
      revealHint();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="mt-6 border-t pt-6">
      <h3 className="text-lg font-semibold mb-3">Need Help?</h3>
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i}>
            {i <= hintsRevealed ? (
              <div className="p-3 bg-yellow-50 text-yellow-800 border border-yellow-200 rounded">
                <strong>Hint {i}:</strong> {hints[i-1]}
              </div>
            ) : (
              <button 
                disabled={i > hintsRevealed + 1}
                onClick={handleReveal}
                className={`w-full text-left p-3 rounded border ${i === hintsRevealed + 1 ? 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100' : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'}`}
              >
                Reveal Hint {i} (Costs 2 pts)
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
