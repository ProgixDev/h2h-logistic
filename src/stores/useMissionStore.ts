import { create } from 'zustand';
import type { Mission, MissionStatus, CancellationReason, OffHubProposal } from '@/types/mission';
import { ACTIVE_STATUSES, COMPLETED_STATUSES } from '@/types/mission';
import { mockProposals, mockActiveMissions, mockCompletedMissions } from '@/services/mock/missions';

const MOCK_SELLER_CONFIRM_DELAY = 5000;
const MOCK_OFFHUB_ACCEPT_DELAY = 3000;
const AUTO_COMPLETE_DELAY = 2000;

interface MissionState {
  proposals: Mission[];
  activeMissions: Mission[];
  completedMissions: Mission[];
  isLoading: boolean;
  missions: Mission[];

  loadMockData: () => void;
  acceptMission: (id: string) => Promise<void>;
  rejectMission: (id: string) => void;
  updateMissionStatus: (id: string, status: MissionStatus) => void;
  confirmPickup: (id: string) => void;
  confirmDelivery: (id: string) => void;
  cancelMission: (id: string, reason: CancellationReason) => void;
  reportSellerAbsence: (id: string) => void;
  reportBuyerAbsence: (id: string, extend?: boolean) => void;
  proposeOffHub: (id: string, proposal: Omit<OffHubProposal, 'status'>) => void;
  getMissionById: (id: string) => Mission | undefined;

  getProposals: () => Mission[];
  getActiveMissions: () => Mission[];
  getCompletedMissions: () => Mission[];
  getPendingMissions: () => Mission[];
}

function rebuildMissions(state: { proposals: Mission[]; activeMissions: Mission[]; completedMissions: Mission[] }) {
  return [...state.proposals, ...state.activeMissions, ...state.completedMissions];
}

function updateActive(state: MissionState, id: string, updater: (m: Mission) => Mission) {
  const newState = {
    proposals: state.proposals,
    activeMissions: state.activeMissions.map((m) => (m.id === id ? updater(m) : m)),
    completedMissions: state.completedMissions,
  };
  return { ...newState, missions: rebuildMissions(newState) };
}

export const useMissionStore = create<MissionState>((set, get) => ({
  proposals: [],
  activeMissions: [],
  completedMissions: [],
  isLoading: false,
  missions: [],

  loadMockData: () => {
    // Idempotent: don't overwrite live state once the store has been seeded.
    // Without this, any screen that calls loadMockData on mount
    // (dashboard, missions tab, messages tab, pull-to-refresh) would reset
    // in-progress status transitions like confirmPickup / confirmDelivery.
    const s = get();
    if (s.proposals.length > 0 || s.activeMissions.length > 0 || s.completedMissions.length > 0) {
      return;
    }
    set({
      proposals: [...mockProposals],
      activeMissions: [...mockActiveMissions],
      completedMissions: [...mockCompletedMissions],
      missions: [...mockProposals, ...mockActiveMissions, ...mockCompletedMissions],
    });
  },

  acceptMission: async (id) => {
    set({ isLoading: true });
    await new Promise((r) => setTimeout(r, 600));

    const proposal = get().proposals.find((m) => m.id === id);
    if (!proposal) { set({ isLoading: false }); return; }

    const sellerTimerEnd = new Date(Date.now() + 20 * 60000).toISOString();
    const updated: Mission = { ...proposal, status: 'seller_pending', sellerTimerEnd, updatedAt: new Date().toISOString() };

    set((state) => {
      const newState = {
        isLoading: false,
        proposals: state.proposals.filter((m) => m.id !== id),
        activeMissions: [updated, ...state.activeMissions],
        completedMissions: state.completedMissions,
      };
      return { ...newState, missions: rebuildMissions(newState) };
    });

    setTimeout(() => {
      const current = get().activeMissions.find((m) => m.id === id);
      if (current && current.status === 'seller_pending') {
        set((state) => updateActive(state, id, (m) => ({ ...m, status: 'group_created', updatedAt: new Date().toISOString() })));
      }
    }, MOCK_SELLER_CONFIRM_DELAY);
  },

  rejectMission: (id) => {
    set((state) => {
      const newState = { proposals: state.proposals.filter((m) => m.id !== id), activeMissions: state.activeMissions, completedMissions: state.completedMissions };
      return { ...newState, missions: rebuildMissions(newState) };
    });
  },

  updateMissionStatus: (id, status) => {
    set((state) => {
      const now = new Date().toISOString();
      const updateInList = (list: Mission[]) => list.map((m) => (m.id === id ? { ...m, status, updatedAt: now } : m));
      const updatedActive = updateInList(state.activeMissions);
      const updatedProposals = updateInList(state.proposals);
      const newlyCompleted = updatedActive.filter((m) => m.id === id && COMPLETED_STATUSES.includes(m.status));
      const remainingActive = newlyCompleted.length > 0 ? updatedActive.filter((m) => m.id !== id) : updatedActive;
      const newState = { proposals: updatedProposals, activeMissions: remainingActive, completedMissions: [...newlyCompleted, ...state.completedMissions] };
      return { ...newState, missions: rebuildMissions(newState) };
    });
  },

  confirmPickup: (id) => {
    const now = new Date().toISOString();
    set((state) => updateActive(state, id, (m) => ({
      ...m, status: 'picked_up' as MissionStatus, updatedAt: now, pickupHub: { ...m.pickupHub, actualTime: now },
    })));
  },

  confirmDelivery: (id) => {
    const now = new Date().toISOString();
    set((state) => updateActive(state, id, (m) => ({
      ...m, status: 'delivered' as MissionStatus, updatedAt: now, deliveryHub: { ...m.deliveryHub, actualTime: now },
    })));
    setTimeout(() => { get().updateMissionStatus(id, 'completed'); }, AUTO_COMPLETE_DELAY);
  },

  cancelMission: (id, reason) => {
    const now = new Date().toISOString();
    set((state) => {
      const cancelled = state.activeMissions.find((m) => m.id === id);
      if (!cancelled) return state;
      const updated: Mission = { ...cancelled, status: 'cancelled', cancellationReason: reason, updatedAt: now };
      const newState = {
        proposals: state.proposals,
        activeMissions: state.activeMissions.filter((m) => m.id !== id),
        completedMissions: [updated, ...state.completedMissions],
      };
      return { ...newState, missions: rebuildMissions(newState) };
    });
  },

  reportSellerAbsence: (id) => {
    get().cancelMission(id, 'seller_no_show');
  },

  reportBuyerAbsence: (id, extend) => {
    if (extend) {
      // Extend tolerance by 5 min (mock: just update the tolerance)
      set((state) => updateActive(state, id, (m) => ({
        ...m, deliveryHub: { ...m.deliveryHub, toleranceMinutes: m.deliveryHub.toleranceMinutes + 5 }, updatedAt: new Date().toISOString(),
      })));
    } else {
      get().cancelMission(id, 'buyer_no_show');
    }
  },

  proposeOffHub: (id, proposal) => {
    const offHubProposal: OffHubProposal = { ...proposal, status: 'pending' };
    set((state) => updateActive(state, id, (m) => ({ ...m, offHubProposal, updatedAt: new Date().toISOString() })));

    // Mock auto-accept after delay
    setTimeout(() => {
      const mission = get().activeMissions.find((m) => m.id === id);
      if (!mission || mission.offHubProposal?.status !== 'pending') return;

      const acceptedProposal: OffHubProposal = { ...mission.offHubProposal!, status: 'accepted' };
      const hubKey = proposal.target === 'seller' ? 'pickupHub' : 'deliveryHub';
      set((state) => updateActive(state, id, (m) => ({
        ...m,
        offHubProposal: acceptedProposal,
        [hubKey]: { ...m[hubKey], isOffHub: true, offHubAddress: proposal.address, name: `Hors hub — ${proposal.address}` },
        updatedAt: new Date().toISOString(),
      })));
    }, MOCK_OFFHUB_ACCEPT_DELAY);
  },

  getMissionById: (id) => {
    const s = get();
    return s.proposals.find((m) => m.id === id) ?? s.activeMissions.find((m) => m.id === id) ?? s.completedMissions.find((m) => m.id === id);
  },

  getProposals: () => get().proposals.filter((m) => m.status === 'proposal'),
  getActiveMissions: () => get().activeMissions.filter((m) => ACTIVE_STATUSES.includes(m.status)),
  getCompletedMissions: () => get().completedMissions,
  getPendingMissions: () => get().proposals.filter((m) => m.status === 'proposal'),
}));
