import { create } from "zustand";
import type { TaskStatus } from "../types";

export type TaskFilter = "all" | "open" | TaskStatus;

interface UiState {
  /** Task list filter chip selection (shared between the chips and the list). */
  taskFilter: TaskFilter;
  setTaskFilter: (filter: TaskFilter) => void;
}

export const useUiStore = create<UiState>((set) => ({
  taskFilter: "all",
  setTaskFilter: (filter) => set({ taskFilter: filter }),
}));
