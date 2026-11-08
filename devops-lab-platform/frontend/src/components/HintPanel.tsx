import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { api } from '../api/client';
import { useLabStore } from '../store/labStore';

export default function HintPanel({ sessionId, hintsAllowed = true }: { sessionId: string; hintsAllowed?: boolean }) {
  const { 
    hintsRevealed, 
    revealHint, 
    scorePreview, 
    setScorePreview, 
    setSessionId 
  } = useLabStore();
  
  const [hints, setHints] = useState<string[]>([]);
  const [cooldown, setCooldown] = useState(0);
  const [showWarningBanner, setShowWarningBanner] = useState(false);
  
  // Custom Modal States
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingHintNum, setPendingHintNum] = useState<number | null>(null);

  useEffect(() => {
    let timer: any;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown(c => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    const initHints = async () => {
      try {
        const res = await api.get(`/sessions/${sessionId}/hints`);
        const { hints_revealed, score_preview, revealed_hints } = res.data;
        
        setSessionId(sessionId);
        setScorePreview(score_preview);
        // Synchronize Zustand hints count directly
        useLabStore.setState({ hintsRevealed: hints_revealed });
        
        // Rebuild local hints array
        const loadedHints = new Array(hints_revealed).fill('');
        revealed_hints.forEach((h: any) => {
          loadedHints[h.number - 1] = h.hint;
        });
        setHints(loadedHints);
      } catch (err) {
        console.error("Failed to load hints:", err);
      }
    };
    initHints();
  }, [sessionId, setSessionId, setScorePreview]);

  const triggerConfirm = () => {
    if (hintsRevealed >= 3 || cooldown > 0) return;
    setPendingHintNum(hintsRevealed + 1);
    setShowConfirmModal(true);
  };

  const handleReveal = async () => {
    if (pendingHintNum === null) return;
    setShowConfirmModal(false);
    
    try {
      const res = await api.post(`/sessions/${sessionId}/hints/${pendingHintNum}`);
      const { hint, score_preview } = res.data;
      
      setHints(prev => [...prev, hint]);
      revealHint();
      setScorePreview(score_preview);
      setCooldown(60); // 1 minute cooldown
      
      // Trigger 3s fading warning banner
      setShowWarningBanner(true);
      const timer = setTimeout(() => {
        setShowWarningBanner(false);
      }, 3000);
      return () => clearTimeout(timer);
    } catch (err) {
      console.error("Failed to reveal hint:", err);
    } finally {
      setPendingHintNum(null);
    }
  };

  return (
    <div className="mt-6 border-t border-border pt-6">
      {/* Custom Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl border border-border shadow-2xl max-w-sm w-full p-6 text-center transform scale-100 transition-all duration-300">
            <div className="mx-auto w-12 h-12 bg-warn/10 rounded-full flex items-center justify-center text-warn text-2xl mb-4 border border-warn/40">
              💡
            </div>
            <h4 className="text-lg font-bold text-content mb-2">Reveal Hint {pendingHintNum}?</h4>
            <p className="text-sm text-muted mb-6 leading-relaxed">
              Revealing this hint will deduct <span className="font-extrabold text-danger">10 points</span> from your maximum possible score on this lab.
            </p>
            <div className="flex gap-3 justify-center">
              <button 
                onClick={() => { setShowConfirmModal(false); setPendingHintNum(null); }}
                className="px-4 py-2.5 border border-border text-content bg-surface rounded-xl hover:bg-surface-2 transition text-sm font-semibold"
              >
                Cancel
              </button>
              <button 
                onClick={handleReveal}
                className="px-5 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary shadow-md shadow-indigo-200 transition text-sm"
              >
                Reveal Hint
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Warning Banner with 3s Fade */}
      <div 
        className={`fixed top-4 right-4 z-50 transform transition-all duration-500 ease-out ${
          showWarningBanner ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-4 opacity-0 scale-95 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-3 p-4 bg-danger text-white rounded-xl shadow-lg border border-danger/30">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="font-bold">Point Deduction!</p>
            <p className="text-xs text-red-100">-10 points deducted from potential lab score.</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-lg font-bold text-content">Need a Hint?</h3>
        <div className="px-3 py-1 rounded-full bg-surface-2 border border-border text-sm font-semibold text-content">
          Current score if you pass now: <span className="font-bold text-primary-strong">{scorePreview}</span>/100
        </div>
      </div>

      {hintsRevealed >= 3 && (
        <div className="mb-4 p-3 bg-warn/10 border border-warn/40 text-warn text-xs font-medium rounded-lg flex items-center gap-2">
          <span>💡</span>
          <span>Max hints used — your max score for this lab is 70/100</span>
        </div>
      )}

      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i}>
            {i <= hintsRevealed ? (
              <AnimatePresence>
                <motion.div
                  key={`hint-${i}-${hintsRevealed}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                  className="p-3.5 bg-warn/10 border border-warn/40 rounded-xl text-sm leading-relaxed text-content shadow-sm"
                >
                  <div className="flex items-center gap-2 font-extrabold text-warn mb-1 text-xs uppercase tracking-wider">
                    <span>✨</span> Hint {i}
                  </div>
                  <div>{hints[i - 1] || 'Loading...'}</div>
                </motion.div>
              </AnimatePresence>
            ) : hintsAllowed ? (
              <button 
                disabled={i > hintsRevealed + 1 || (i === hintsRevealed + 1 && cooldown > 0)}
                onClick={triggerConfirm}
                className={`w-full text-left p-3.5 rounded-xl border text-sm font-semibold transition-all duration-300 flex items-center justify-between ${
                  i === hintsRevealed + 1 && cooldown === 0 
                    ? 'border-primary/30 bg-primary/10 text-primary-strong hover:bg-primary/15 hover:border-primary/40 hover:shadow-sm' 
                    : i === hintsRevealed + 1 && cooldown > 0 
                    ? 'border-border bg-surface-2 text-muted cursor-wait' 
                    : 'border-border bg-surface-2/50 text-muted cursor-not-allowed'
                }`}
              >
                <span>
                  {i === hintsRevealed + 1 && cooldown > 0 
                    ? `Wait for cooldown...` 
                    : `Reveal Hint ${i}`}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-surface border border-border text-muted">
                  {i === hintsRevealed + 1 && cooldown > 0 
                    ? `${cooldown}s remaining` 
                    : `Costs 10 pts`}
                </span>
              </button>
            ) : (
              <span className="w-full rounded-xl border border-border bg-surface-2/50 p-3.5 text-left text-sm font-semibold text-muted">
                🔒 Hints are disabled on this platform
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}



