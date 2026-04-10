import { create } from 'zustand';
import type { TransporterProfile, ProfileData } from '@/types/user';
import { storage, StorageKeys, getStoredJSON, setStoredJSON } from '@/services/storage';

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
  hydrate: () => void;
  setOnboarded: (value: boolean) => void;
  sendOTP: (phone: string) => Promise<void>;
  verifyOTP: (code: string) => Promise<boolean>;
  completeProfile: (data: ProfileData) => Promise<void>;
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

  hydrate: () => {
    const isOnboarded = storage.getBoolean(StorageKeys.IS_ONBOARDED) ?? false;
    const token = storage.getString(StorageKeys.AUTH_TOKEN) ?? null;
    const user = getStoredJSON<TransporterProfile>(StorageKeys.USER);
    const transporterStatus =
      (storage.getString(StorageKeys.TRANSPORTER_STATUS) as TransporterStatus) ?? 'offline';

    set({
      isOnboarded,
      token,
      user,
      isAuthenticated: !!token && !!user,
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
      };

      storage.set(StorageKeys.AUTH_TOKEN, mockToken);
      setStoredJSON(StorageKeys.USER, existingUser);

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
    set({
      user: null,
      isAuthenticated: false,
      token: null,
      isNewUser: true,
      transporterStatus: 'offline',
      phoneNumber: null,
    });
  },
}));
