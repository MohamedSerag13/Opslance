import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LabState {
  currentSessionId: string | null;
  hintsRevealed: number;
  scorePreview: number;
  setSessionId: (id: string | null) => void;
  revealHint: () => void;
  setScorePreview: (score: number) => void;
  resetLabState: () => void;
}

export const useLabStore = create<LabState>()(
  persist(
    (set) => ({
      currentSessionId: null,
      hintsRevealed: 0,
      scorePreview: 100,
      setSessionId: (id) => set({ currentSessionId: id }),
      revealHint: () => set((state) => ({ hintsRevealed: Math.min(state.hintsRevealed + 1, 3) })),
      setScorePreview: (score) => set({ scorePreview: score }),
      resetLabState: () => set({ currentSessionId: null, hintsRevealed: 0, scorePreview: 100 }),
    }),
    {
      name: 'lab-storage',
    }
  )
);

