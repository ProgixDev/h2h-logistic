import { create } from 'zustand';
import type { IncidentRecord, IncidentFormType } from '@/types/incident';
import { contestationDeadline } from '@/constants/delaysRules';

/** Declaration types that open a 24h contestation window (D1/D2/D3). */
const CONTEST_OPENING_TYPES: IncidentFormType[] = ['buyer_absent', 'transporter_absent', 'seller_absent'];

/** A record to submit — id/createdAt/contestationDeadline are filled by the store. */
export type IncidentDraft = Omit<IncidentRecord, 'id' | 'createdAt' | 'contestationDeadline'> & {
  contestationDeadline?: string;
};

const MOCK_SUBMIT_DELAY = 800;

interface IncidentsState {
  incidents: IncidentRecord[];
  isSubmitting: boolean;
  submitIncident: (draft: IncidentDraft) => Promise<IncidentRecord>;
  getIncidentsForMission: (missionId: string) => IncidentRecord[];
}

function buildRecord(draft: IncidentDraft, meta: { id: string; createdAt: string }): IncidentRecord {
  // Deadlines come from the centralized module (Partie 2), never inlined.
  const deadline =
    draft.contestationDeadline ??
    (CONTEST_OPENING_TYPES.includes(draft.type) ? contestationDeadline(meta.createdAt) : undefined);
  return { ...draft, id: meta.id, createdAt: meta.createdAt, contestationDeadline: deadline };
}

// ─── Seeds (demo) ───────────────────────────────────────────────────────────
function seedIncidents(): IncidentRecord[] {
  const declaredAt = '2026-07-11T17:15:00.000Z';
  return [
    buildRecord(
      {
        type: 'buyer_absent',
        transactionId: 'TX-A1B2C3',
        missionId: 'mission-a1',
        declarantRole: 'transporter',
        hubName: 'Gare Saint-Charles',
        rendezvousAt: '2026-07-11T17:00:00.000Z',
        declaredAt,
        missionStatus: 'support_review',
        accuracyConfirmed: true,
        comment: "Présent au hub avec le colis, acheteur non présent après la tolérance.",
      },
      { id: 'incident-seed-1', createdAt: declaredAt },
    ),
    buildRecord(
      {
        type: 'cancel_seller',
        transactionId: 'TX-D4E5F6',
        missionId: 'mission-a2',
        declarantRole: 'seller',
        hubName: "Gare d'Antibes",
        rendezvousAt: '2026-07-12T17:30:00.000Z',
        declaredAt: '2026-07-10T09:00:00.000Z',
        missionStatus: 'closed',
        accuracyConfirmed: true,
        reason: 'Vente annulée',
      },
      { id: 'incident-seed-2', createdAt: '2026-07-10T09:00:00.000Z' },
    ),
  ];
}

export const useIncidentsStore = create<IncidentsState>((set, get) => ({
  incidents: seedIncidents(),
  isSubmitting: false,

  submitIncident: async (draft) => {
    set({ isSubmitting: true });
    try {
      await new Promise((r) => setTimeout(r, MOCK_SUBMIT_DELAY));
      const now = new Date().toISOString();
      const record = buildRecord(draft, { id: `incident-${Date.now()}`, createdAt: now });
      set((state) => ({ incidents: [record, ...state.incidents], isSubmitting: false }));
      return record;
    } catch (e) {
      set({ isSubmitting: false });
      throw e;
    }
  },

  getIncidentsForMission: (missionId) => get().incidents.filter((i) => i.missionId === missionId),
}));
