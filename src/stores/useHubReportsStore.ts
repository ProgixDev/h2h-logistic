import { create } from 'zustand';
import type { HubReportPayload, HubReportReason } from '@/constants/signalementHub';
// 🔴 `submitHubReport` ATTENDAIT UNE SECONDE ET RENDAIT UN IDENTIFIANT
// FABRIQUÉ. Rien ne partait, et l'écran remerciait. Les libellés des motifs
// restent côté écran — ils n'ont jamais été le défaut.
import { signalerHub } from '@/services/signalements';
import { useAuthStore } from '@/stores/useAuthStore';

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
      // 🔴 LE SIGNALEMENT PART VRAIMENT, et on garde l identifiant que la BASE
      // a ecrit : une reference fabriquee localement ne permet ni de retrouver
      // le dossier, ni de prouver qu on a signale.
      const envoye = await signalerHub({
        hubId: payload.hubId,
        motif: payload.reason,
        explication: payload.notes,
        missionId: payload.missionId ?? null,
        // 🔴 CES DEUX LIGNES MANQUAIENT, ET L'ÉCRAN PROMETTAIT LE CONTRAIRE.
        // `hub/report.tsx` propose « jusqu'à N photos pour illustrer », le
        // payload les portait jusqu'ici — et l'appel les laissait tomber.
        // `signaler_hub` accepte `p_proofs` depuis sa création : le serveur
        // attendait, personne n'envoyait. Mesuré : 1 signalement, 0 preuve.
        profilId: useAuthStore.getState().user?.id ?? null,
        photoUris: payload.photoUris,
      });
      const result = { id: envoye.id, createdAt: envoye.creeLe };
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
