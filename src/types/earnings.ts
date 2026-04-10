export type TransactionType = 'earning' | 'withdrawal' | 'cancelled';
export type DeliveryStatus = 'completed' | 'cancelled' | 'dispute';

export interface Transaction {
  id: string;
  type: TransactionType;
  missionId?: string;
  amount: number;
  route: string;           // "Nice → Marseille"
  pickupHub: string;
  deliveryHub: string;
  packageTitle: string;
  packageSize: string;
  packageWeight: number;
  sellerName: string;
  buyerName: string;
  pickupTime?: string;
  deliveryTime?: string;
  deliveryStatus: DeliveryStatus;
  rating?: number;         // 1-5 stars received
  date: string;
  reference: string;       // "#HTH-XXXX"
}

export interface EarningsStats {
  totalDeliveries: number;
  successRate: number;      // 0-100
  totalEarnings: number;
  averageRating: number;    // 0-5
}

export interface DailyEarning {
  date: string;
  amount: number;
  deliveries: number;
}

export interface EarningsSummary {
  balance: number;
  todayEarnings: number;
  weekEarnings: number;
  monthEarnings: number;
  totalEarnings: number;
  totalMissions: number;
  availableBalance: number;
  pendingBalance: number;
  withdrawnTotal: number;
  thisMonth: number;
  lastMonth: number;
}

// Legacy compat
export interface EarningEntry {
  id: string;
  missionId: string;
  amount: number;
  date: string;
  status: 'pending' | 'available' | 'withdrawn';
  description: string;
}

export interface WithdrawalRequest {
  id: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requestedAt: string;
  completedAt?: string;
}
