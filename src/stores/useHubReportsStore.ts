import { create } from 'zustand';
import type { HubReportPayload, HubReportReason } from '@/services/mock/hubReports';
import { submitHubReport } from '@/services/mock/hubReports';

export interface HubReportRecord {
  id: string;
  hubId: string;
  hubName: string;
  reason: HubReportReason;
  notes?: string;
  photoUris?: string[];
  createdAt: string;
}

interface HubReportsState {
  reports: HubReportRecord[];
  isSubmitting: boolean;
  submit: (payload: HubReportPayload) => Promise<HubReportRecord>;
  getReportsForHub: (hubId: string) => HubReportRecord[];
}

export const useHubReportsStore = create<HubReportsState>((set, get) => ({
  reports: [],
  isSubmitting: false,

  submit: async (payload) => {
    set({ isSubmitting: true });
    try {
      const result = await submitHubReport(payload);
      const record: HubReportRecord = {
        id: result.id,
        createdAt: result.createdAt,
        ...payload,
      };
      set((state) => ({ reports: [record, ...state.reports], isSubmitting: false }));
      return record;
    } catch (e) {
      set({ isSubmitting: false });
      throw e;
    }
  },

  getReportsForHub: (hubId) => get().reports.filter((r) => r.hubId === hubId),
}));
