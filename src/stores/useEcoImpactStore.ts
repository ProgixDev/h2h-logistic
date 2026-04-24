import { create } from 'zustand';

interface MonthlyImpact {
  /** "YYYY-MM" */
  month: string;
  kgSaved: number;
  deliveries: number;
}

interface EcoImpactState {
  totalKgSavedAllTime: number;
  totalKgSavedThisMonth: number;
  kgSavedLastMonth: number;
  monthlyHistory: MonthlyImpact[];
  deliveriesAllTime: number;

  /** Increment after a successful delivery. */
  registerDelivery: (kgSaved: number) => void;
  /** Reset — used in dev or tests. */
  reset: () => void;
  /** Load demo seed values (idempotent). */
  loadMockData: () => void;
}

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

const MOCK_SEED = {
  totalKgSavedAllTime: 24.7,
  totalKgSavedThisMonth: 6.8,
  kgSavedLastMonth: 9.2,
  deliveriesAllTime: 47,
  monthlyHistory: [
    { month: '2026-01', kgSaved: 8.4, deliveries: 12 },
    { month: '2026-02', kgSaved: 9.2, deliveries: 13 },
    { month: '2026-03', kgSaved: 9.2, deliveries: 14 },
    { month: '2026-04', kgSaved: 6.8, deliveries: 8 },
  ] as MonthlyImpact[],
};

export const useEcoImpactStore = create<EcoImpactState>((set, get) => ({
  totalKgSavedAllTime: 0,
  totalKgSavedThisMonth: 0,
  kgSavedLastMonth: 0,
  monthlyHistory: [],
  deliveriesAllTime: 0,

  registerDelivery: (kgSaved: number) => {
    if (!Number.isFinite(kgSaved) || kgSaved <= 0) return;
    const month = currentMonthKey();
    set((state) => {
      const history = [...state.monthlyHistory];
      const idx = history.findIndex((h) => h.month === month);
      if (idx >= 0) {
        history[idx] = {
          ...history[idx],
          kgSaved: Math.round((history[idx].kgSaved + kgSaved) * 100) / 100,
          deliveries: history[idx].deliveries + 1,
        };
      } else {
        history.push({ month, kgSaved, deliveries: 1 });
      }
      return {
        totalKgSavedAllTime: Math.round((state.totalKgSavedAllTime + kgSaved) * 100) / 100,
        totalKgSavedThisMonth:
          Math.round((state.totalKgSavedThisMonth + kgSaved) * 100) / 100,
        kgSavedLastMonth: state.kgSavedLastMonth,
        monthlyHistory: history,
        deliveriesAllTime: state.deliveriesAllTime + 1,
      };
    });
  },

  reset: () => set({
    totalKgSavedAllTime: 0,
    totalKgSavedThisMonth: 0,
    kgSavedLastMonth: 0,
    monthlyHistory: [],
    deliveriesAllTime: 0,
  }),

  loadMockData: () => {
    // Don't overwrite live counters if the user has already accumulated some.
    if (get().totalKgSavedAllTime > 0) return;
    set({ ...MOCK_SEED });
  },
}));
