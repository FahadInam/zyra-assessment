import { create } from "zustand";

type GridMode = "cards" | "table";
type GridSort = "name" | "grade" | "gpa" | "urgency";

interface UiState {
  /** Persists the student grid view mode across navigation. */
  gridMode: GridMode;
  setGridMode: (mode: GridMode) => void;

  /** Persists the student grid sort preference across navigation. */
  gridSort: GridSort;
  setGridSort: (sort: GridSort) => void;
}

export const useUiStore = create<UiState>((set) => ({
  gridMode: "cards",
  setGridMode: (gridMode) => set({ gridMode }),

  gridSort: "name",
  setGridSort: (gridSort) => set({ gridSort }),
}));
