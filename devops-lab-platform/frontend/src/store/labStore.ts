import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LabState {
  currentSessionId: string | null;
  hintsRevealed: number;
  setSessionId: (id: string | null) => void;
  revealHint: () => void;
  resetLabState: () => void;
}

export const useLabStore = create<LabState>()(
  persist(
    (set) => ({
      currentSessionId: null,
      hintsRevealed: 0,
      setSessionId: (id) => set({ currentSessionId: id }),
      revealHint: () => set((state) => ({ hintsRevealed: Math.min(state.hintsRevealed + 1, 3) })),
      resetLabState: () => set({ currentSessionId: null, hintsRevealed: 0 }),
    }),
    {
      name: 'lab-storage',
    }
  )
);
