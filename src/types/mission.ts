export type MissionStatus =
  | 'proposal'
  | 'accepted'
  | 'seller_pending'
  | 'group_created'
  | 'pickup_pending'
  | 'picked_up'
  | 'in_transit'
  | 'deposited'
  | 'delivery_pending'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'expired';

export type CancellationReason =
  | 'seller_no_show'
  | 'buyer_no_show'
  | 'transporter_cancelled_before_pickup'
  | 'transporter_cancelled_after_pickup'
  | 'seller_timer_expired'
  | 'other';

export interface MissionParticipant {
  id: string;
  name: string;
  avatar?: string;
  phone: string;
  rating?: number;
  role: 'seller' | 'buyer' | 'transporter';
  isFavorite?: boolean;
  qrCode?: string;
}

export interface MissionPackage {
  id: string;
  description: string;
  size: string;
  weight: number;
  photo?: string;
  thumbnail?: string;
  condition?: string;
  trackingNumber?: string;
}

export interface MissionHub {
  id: string;
  name: string;
  city: string;
  scheduledTime: string;
  toleranceMinutes: number;
  actualTime?: string;
  qrCode?: string;
  otpCode?: string;
  isOffHub?: boolean;
  offHubAddress?: string;
}

export interface OffHubProposal {
  target: 'seller' | 'buyer';
  address: string;
  proposedTime: string;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface Mission {
  id: string;
  routeId: string;
  status: MissionStatus;
  seller: MissionParticipant;
  buyer: MissionParticipant;
  transporter: MissionParticipant;
  package: MissionPackage;
  pickupHub: MissionHub;
  deliveryHub: MissionHub;
  price: number;
  transporterEarning: number;
  platformFee: number;
  sellerTimerEnd?: string;
  proposalExpiresAt?: string;
  cancellationReason?: CancellationReason;
  offHubProposal?: OffHubProposal;
  isReturn?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MissionGroup {
  id: string;
  missions: Mission[];
  routeId: string;
  totalEarnings: number;
}

export const ACTIVE_STATUSES: MissionStatus[] = [
  'accepted', 'seller_pending', 'group_created',
  'pickup_pending', 'picked_up', 'in_transit', 'deposited', 'delivery_pending',
];

export const COMPLETED_STATUSES: MissionStatus[] = ['delivered', 'completed'];
