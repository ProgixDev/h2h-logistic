import { create } from 'zustand';
import type {
  TransporterProfile,
  ProfileData,
  ConventionAcceptance,
  ConventionAcceptanceInput,
} from '@/types/user';
import { storage, StorageKeys, getStoredJSON, setStoredJSON } from '@/services/storage';
import { CONVENTION_TRANSPORTEUR_VERSION } from '@/constants/ConventionTransporteur';

type TransporterStatus = 'active' | 'offline';

interface AuthState {
  user: TransporterProfile | null;
  isAuthenticated: boolean;
  isOnboarded: boolean;
  isLoading: boolean;
  token: string | null;
  isNewUser: boolean;
  transporterStatus: TransporterStatus;
  phoneNumber: string | null;

  // Actions
  hydrate: () => Promise<void>;
  setOnboarded: (value: boolean) => void;
  sendOTP: (phone: string) => Promise<void>;
  verifyOTP: (code: string) => Promise<boolean>;
  completeProfile: (data: ProfileData) => Promise<void>;
  saveConventionAcceptance: (input: ConventionAcceptanceInput) => Promise<void>;
  saveIban: (iban: string) => Promise<void>;
  validateAccount: () => Promise<void>;
  setTransporterStatus: (status: TransporterStatus) => void;
  toggleOnline: () => void;
  logout: () => void;
}

const MOCK_DELAY = 800;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isOnboarded: false,
  isLoading: false,
  token: null,
  isNewUser: true,
  transporterStatus: 'offline',
  phoneNumber: null,

  hydrate: async () => {
    await storage.ready();
    const isOnboarded = storage.getBoolean(StorageKeys.IS_ONBOARDED) ?? false;
    const token = storage.getString(StorageKeys.AUTH_TOKEN) ?? null;
    const user = getStoredJSON<TransporterProfile>(StorageKeys.USER);
    const transporterStatus =
      (storage.getString(StorageKeys.TRANSPORTER_STATUS) as TransporterStatus) ?? 'offline';
    const convention = getStoredJSON<ConventionAcceptance>(
      StorageKeys.CONVENTION_ACCEPTANCE,
    );

    const hydratedUser = user && convention ? { ...user, convention } : user;

    set({
      isOnboarded,
      token,
      user: hydratedUser,
      isAuthenticated: !!token && !!hydratedUser,
      transporterStatus,
    });
  },

  setOnboarded: (value) => {
    storage.set(StorageKeys.IS_ONBOARDED, value);
    set({ isOnboarded: value });
  },

  sendOTP: async (phone) => {
    set({ isLoading: true, phoneNumber: phone });
    storage.set(StorageKeys.PHONE_NUMBER, phone);
    await delay(MOCK_DELAY);
    set({ isLoading: false });
  },

  verifyOTP: async (code) => {
    set({ isLoading: true });
    await delay(MOCK_DELAY);

    const isValid = code.length === 6;
    if (!isValid) {
      set({ isLoading: false });
      return false;
    }

    // Existing user: specific phone number OR code "000000"
    const phone = get().phoneNumber?.replace(/\s/g, '') ?? '';
    const isExisting = code === '000000' || phone === '+330642799884' || phone === '0642799884';
    const mockToken = `mock_token_${Date.now()}`;

    if (isExisting) {
      const stubConvention: ConventionAcceptance = {
        version: CONVENTION_TRANSPORTEUR_VERSION,
        representative: 'Achraf Arabi',
        iban: 'FR7612345678901234567890123',
        wantsBankTransfer: true,
        debitAuthorized: true,
        signatureData: 'M0,0 L1,1',
        acceptedAt: '2026-01-15T10:00:00Z',
      };
      const existingUser: TransporterProfile = {
        id: 'user-1',
        firstName: 'Achraf',
        lastName: 'Arabi',
        phone: get().phoneNumber ?? '+33 6 42 79 98 84',
        role: 'transporter',
        isVerified: true,
        isOnline: false,
        rating: 4.8,
        totalDeliveries: 52,
        createdAt: '2026-01-15T10:00:00Z',
        transportTypes: ['train', 'car'],
        favoriteHubs: ['hub-nice-gare', 'hub-cannes-gare'],
        documentsVerified: true,
        city: 'Nice',
        convention: stubConvention,
      };

      storage.set(StorageKeys.AUTH_TOKEN, mockToken);
      setStoredJSON(StorageKeys.USER, existingUser);
      setStoredJSON(StorageKeys.CONVENTION_ACCEPTANCE, stubConvention);

      set({
        isLoading: false,
        isNewUser: false,
        token: mockToken,
        user: existingUser,
        isAuthenticated: true,
      });
    } else {
      storage.set(StorageKeys.AUTH_TOKEN, mockToken);
      set({
        isLoading: false,
        isNewUser: true,
        token: mockToken,
      });
    }

    return true;
  },

  completeProfile: async (data) => {
    set({ isLoading: true });
    await delay(MOCK_DELAY);

    const phone = get().phoneNumber ?? '+33 6 00 00 00 00';
    const newUser: TransporterProfile = {
      id: `user-${Date.now()}`,
      firstName: data.firstName,
      lastName: data.lastName,
      phone,
      avatar: data.avatar,
      role: 'transporter',
      isVerified: true,
      isOnline: false,
      rating: 5.0,
      totalDeliveries: 0,
      createdAt: new Date().toISOString(),
      transportTypes: [data.transportType],
      favoriteHubs: [],
      documentsVerified: false,
      city: data.city,
    };

    setStoredJSON(StorageKeys.USER, newUser);

    set({
      isLoading: false,
      user: newUser,
      isAuthenticated: true,
      isNewUser: false,
    });
  },

  saveConventionAcceptance: async (input) => {
    set({ isLoading: true });
    await delay(MOCK_DELAY);

    const acceptance: ConventionAcceptance = {
      version: CONVENTION_TRANSPORTEUR_VERSION,
      representative: input.representative.trim(),
      iban: input.iban.replace(/\s/g, '').toUpperCase(),
      wantsBankTransfer: input.wantsBankTransfer,
      debitAuthorized: input.debitAuthorized,
      signatureData: input.signatureData,
      acceptedAt: new Date().toISOString(),
    };

    setStoredJSON(StorageKeys.CONVENTION_ACCEPTANCE, acceptance);

    const current = get().user;
    if (current) {
      const updated: TransporterProfile = { ...current, convention: acceptance };
      setStoredJSON(StorageKeys.USER, updated);
      set({ user: updated, isLoading: false });
    } else {
      set({ isLoading: false });
    }
  },

  // Bank details — collected on a dedicated screen after the convention.
  saveIban: async (iban) => {
    set({ isLoading: true });
    await delay(MOCK_DELAY);
    const current = get().user;
    const cleanIban = iban.replace(/\s/g, '').toUpperCase();
    if (current?.convention) {
      const convention: ConventionAcceptance = {
        ...current.convention,
        iban: cleanIban,
        wantsBankTransfer: true,
      };
      const updated: TransporterProfile = { ...current, convention };
      setStoredJSON(StorageKeys.USER, updated);
      setStoredJSON(StorageKeys.CONVENTION_ACCEPTANCE, convention);
      set({ user: updated, isLoading: false });
    } else {
      set({ isLoading: false });
    }
  },

  // Platform review — no real backend, so the pending screen calls this to
  // approve the account (auto after a short delay in the demo).
  validateAccount: async () => {
    const current = get().user;
    if (!current) return;
    const updated: TransporterProfile = { ...current, documentsVerified: true };
    setStoredJSON(StorageKeys.USER, updated);
    set({ user: updated });
  },

  setTransporterStatus: (status) => {
    storage.set(StorageKeys.TRANSPORTER_STATUS, status);
    set((state) => ({
      transporterStatus: status,
      user: state.user ? { ...state.user, isOnline: status === 'active' } : null,
    }));
  },

  toggleOnline: () => {
    const current = get().transporterStatus;
    const next = current === 'active' ? 'offline' : 'active';
    get().setTransporterStatus(next);
  },

  logout: () => {
    storage.remove(StorageKeys.AUTH_TOKEN);
    storage.remove(StorageKeys.USER);
    storage.remove(StorageKeys.TRANSPORTER_STATUS);
    storage.remove(StorageKeys.PHONE_NUMBER);
    storage.remove(StorageKeys.CONVENTION_ACCEPTANCE);
    // Full restart: also reset onboarding so the intro is shown again.
    storage.remove(StorageKeys.IS_ONBOARDED);
    set({
      user: null,
      isAuthenticated: false,
      isOnboarded: false,
      token: null,
      isNewUser: true,
      transporterStatus: 'offline',
      phoneNumber: null,
    });
  },
}));
