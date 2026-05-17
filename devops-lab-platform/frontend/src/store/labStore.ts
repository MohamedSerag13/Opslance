import { create } from 'zustand';

interface LabState {
  currentSessionId: string | null;
  hintsRevealed: number;
  setSessionId: (id: string | null) => void;
  revealHint: () => void;
  resetLabState: () => void;
}

export const useLabStore = create<LabState>((set) => ({
  currentSessionId: null,
  hintsRevealed: 0,
  setSessionId: (id) => set({ currentSessionId: id }),
  revealHint: () => set((state) => ({ hintsRevealed: Math.min(state.hintsRevealed + 1, 3) })),
  resetLabState: () => set({ currentSessionId: null, hintsRevealed: 0 }),
}));
