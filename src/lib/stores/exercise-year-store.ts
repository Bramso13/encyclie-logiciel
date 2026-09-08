import { create } from "zustand";
import { calendarYear } from "@/lib/quotes/exercise-year-filter";
import {
  setTariffOverlays,
  type TariffOverlay,
} from "@/lib/tarificateurs/tariff-registry";

export type TariffYearListItem = {
  year: number;
  builtin: boolean;
  frozen: boolean;
  rates: TariffOverlay;
};

type ExerciseYearState = {
  exerciseYear: number;
  years: TariffYearListItem[];
  loaded: boolean;
  setExerciseYear: (year: number) => void;
  hydrate: () => Promise<void>;
};

export const useExerciseYearStore = create<ExerciseYearState>((set, get) => ({
  exerciseYear: calendarYear(),
  years: [],
  loaded: false,
  setExerciseYear: (year) => set({ exerciseYear: year }),
  hydrate: async () => {
    try {
      const res = await fetch("/api/admin/tariff-years");
      if (!res.ok) return;
      const raw = await res.json();
      const years = (raw.data?.years ?? []) as TariffYearListItem[];
      setTariffOverlays(
        years.filter((item) => !item.builtin).map((item) => item.rates),
      );
      const current = get().exerciseYear;
      const known = years.map((item) => item.year);
      set({
        years,
        loaded: true,
        exerciseYear: known.includes(current) ? current : calendarYear(),
      });
    } catch {
      set({ loaded: true });
    }
  },
}));
