import { create } from 'zustand';
import type { PublishedRoute, PublishFormData } from '@/types/route';
import { INITIAL_FORM } from '@/types/route';
import type { TransportTypeId } from '@/constants/TransportTypes';
import { mockRoutes } from '@/services/mock/routes';
import { storage, getStoredJSON, setStoredJSON } from '@/services/storage';
import { useMissionStore } from '@/stores/useMissionStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { ACTIVE_STATUSES } from '@/types/mission';

const ROUTES_KEY = 'published_routes';

interface RouteState {
  routes: PublishedRoute[];
  form: PublishFormData;
  currentStep: number;
  isPublishing: boolean;

  hydrate: () => Promise<void>;

  // Routes CRUD
  addRoute: (route: PublishedRoute) => void;
  updateRoute: (id: string, updates: Partial<PublishedRoute>) => void;
  deleteRoute: (id: string) => void;
  toggleRouteStatus: (id: string) => void;

  // Queries
  hasActiveMission: (routeId: string) => boolean;
  getActiveRoutes: () => PublishedRoute[];
  getPausedRoutes: () => PublishedRoute[];

  // Publish flow
  setFormField: <K extends keyof PublishFormData>(key: K, value: PublishFormData[K]) => void;
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  resetForm: () => void;
  publishRoute: (transporterId: string) => Promise<PublishedRoute>;
  loadMockData: () => void;
}

export const useRouteStore = create<RouteState>((set, get) => ({
  routes: [],
  form: { ...INITIAL_FORM },
  currentStep: 1,
  isPublishing: false,

  hydrate: async () => {
    await storage.ready();
    const saved = getStoredJSON<PublishedRoute[]>(ROUTES_KEY);
    if (saved && saved.length > 0) set({ routes: saved });
  },

  addRoute: (route) => {
    const updated = [route, ...get().routes];
    set({ routes: updated });
    setStoredJSON(ROUTES_KEY, updated);
  },

  updateRoute: (id, updates) => {
    const updated = get().routes.map((r) => (r.id === id ? { ...r, ...updates } : r));
    set({ routes: updated });
    setStoredJSON(ROUTES_KEY, updated);
  },

  deleteRoute: (id) => {
    const updated = get().routes.filter((r) => r.id !== id);
    set({ routes: updated });
    setStoredJSON(ROUTES_KEY, updated);
  },

  toggleRouteStatus: (id) => {
    const route = get().routes.find((r) => r.id === id);
    if (!route) return;
    const newStatus = route.status === 'active' ? 'paused' : 'active';
    get().updateRoute(id, { status: newStatus });
  },

  hasActiveMission: (routeId) => {
    const missionState = useMissionStore.getState();
    return missionState.activeMissions.some(
      (m) => m.routeId === routeId && ACTIVE_STATUSES.includes(m.status),
    );
  },

  getActiveRoutes: () => get().routes.filter((r) => r.status === 'active'),
  getPausedRoutes: () => get().routes.filter((r) => r.status === 'paused'),

  setFormField: (key, value) =>
    set((state) => ({ form: { ...state.form, [key]: value } })),

  setStep: (step) => set({ currentStep: step }),
  nextStep: () => set((s) => ({ currentStep: Math.min(s.currentStep + 1, 8) })),
  prevStep: () => set((s) => ({ currentStep: Math.max(s.currentStep - 1, 1) })),
  resetForm: () => set({ form: { ...INITIAL_FORM }, currentStep: 1 }),

  publishRoute: async (transporterId) => {
    set({ isPublishing: true });
    await new Promise((r) => setTimeout(r, 800));

    const f = get().form;
    // Transport is no longer asked during publish — inherit the carrier's
    // declared profile transport (falls back to 'car'), still editable later.
    const profileTransport = useAuthStore.getState().user?.transportTypes?.[0] as
      | TransportTypeId
      | undefined;
    const route: PublishedRoute = {
      id: `route-${Date.now()}`,
      transporterId,
      type: f.type!,
      departureCity: f.departureCity!,
      arrivalCity: f.arrivalCity!,
      pickupHub: f.pickupHub!,
      deliveryHubs: f.deliveryHubs,
      transportType: f.transportType ?? profileTransport ?? 'car',
      maxPackages: f.maxPackages,
      maxSize: f.maxSize!,
      maxWeight: f.maxWeight,
      horsHub: f.horsHub,
      schedule: {
        pickupTime: f.pickupTime!,
        deliveryTimes: f.deliveryTimes,
        recurringDays: f.type === 'recurring' ? f.recurringDays : undefined,
      },
      status: 'active',
      missionsCount: 0,
      createdAt: new Date().toISOString(),
    };

    get().addRoute(route);
    set({ isPublishing: false });
    get().resetForm();
    return route;
  },

  loadMockData: () => {
    // Idempotent: preserve any routes the user has already created/modified.
    if (get().routes.length > 0) return;
    set({ routes: mockRoutes });
  },
}));
