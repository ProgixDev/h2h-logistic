import { create } from 'zustand';
import type { Transaction, EarningsStats, DailyEarning, EarningsSummary, EarningEntry } from '@/types/earnings';
import { mockTransactions, mockStats, mockDailyEarnings, mockEarningsSummary, mockEarnings } from '@/services/mock/earnings';

type Period = 'today' | 'week' | 'month' | 'total';

interface EarningsState {
  transactions: Transaction[];
  stats: EarningsStats;
  dailyEarnings: DailyEarning[];
  summary: EarningsSummary | null;
  entries: EarningEntry[];  // legacy
  isLoading: boolean;

  loadMockData: () => void;
  getEarningsForPeriod: (period: Period) => { amount: number; deliveries: number };
  getTransactionsByStatus: (status: 'completed' | 'cancelled' | 'dispute' | 'all') => Transaction[];
}

export const useEarningsStore = create<EarningsState>((set, get) => ({
  transactions: [],
  stats: { totalDeliveries: 0, successRate: 0, totalEarnings: 0, averageRating: 0 },
  dailyEarnings: [],
  summary: null,
  entries: [],
  isLoading: false,

  loadMockData: () =>
    set({
      transactions: mockTransactions,
      stats: mockStats,
      dailyEarnings: mockDailyEarnings,
      summary: mockEarningsSummary,
      entries: mockEarnings,
    }),

  getEarningsForPeriod: (period) => {
    const s = get().summary;
    if (!s) return { amount: 0, deliveries: 0 };
    switch (period) {
      case 'today': return { amount: s.todayEarnings, deliveries: 1 };
      case 'week': return { amount: s.weekEarnings, deliveries: 6 };
      case 'month': return { amount: s.monthEarnings, deliveries: 14 };
      case 'total': return { amount: s.totalEarnings, deliveries: s.totalMissions };
    }
  },

  getTransactionsByStatus: (status) => {
    const txs = get().transactions;
    if (status === 'all') return txs;
    return txs.filter((t) => t.deliveryStatus === status);
  },
}));
