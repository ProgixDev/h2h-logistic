import type { TransportTypeId, PackageSize } from '@/constants/TransportTypes';

export type RouteType = 'recurring' | 'one_time';

export interface RouteHub {
  hubId: string;
  hubName: string;
  city: string;
  arrivalTime: string;
  departureTime?: string;
}

export interface PublishedRoute {
  id: string;
  transporterId: string;
  type: RouteType;
  departureCity: string;
  arrivalCity: string;
  pickupHub: RouteHub;
  deliveryHubs: RouteHub[];
  transportType: TransportTypeId;
  maxPackages: number;
  maxSize: PackageSize;
  maxWeight: number;
  horsHub: boolean;
  schedule: {
    pickupTime: string;
    deliveryTimes: Record<string, string>;
    recurringDays?: number[];
  };
  status: 'active' | 'paused' | 'expired';
  missionsCount: number;
  createdAt: string;
}

// --- Publish form (8 steps) ---

export interface PublishFormData {
  // Step 1
  type?: RouteType;
  // Step 2
  departureCity?: string;
  arrivalCity?: string;
  // Step 3
  pickupHub?: RouteHub;
  // Step 4
  deliveryHubs: RouteHub[];
  // Step 5
  pickupTime?: string;
  deliveryTimes: Record<string, string>; // hubId → "HH:mm"
  recurringDays: number[]; // 1=Mon…7=Sun
  // Defaulted from the carrier's profile transport — no longer a publish step
  transportType?: TransportTypeId;
  // Step 6
  maxPackages: number;
  maxSize?: PackageSize;
  maxWeight: number;
  // Step 7
  horsHub: boolean;
}

export const INITIAL_FORM: PublishFormData = {
  deliveryHubs: [],
  deliveryTimes: {},
  recurringDays: [],
  maxPackages: 3,
  maxWeight: 5,
  horsHub: false,
};

export const STEP_LABELS = [
  'Type',
  'Villes',
  'Hub collecte',
  'Hub remise',
  'Horaires',
  'Capacité',
  'Options',
  'Récap',
] as const;
