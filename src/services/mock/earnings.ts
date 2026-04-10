import type { Transaction, EarningsStats, DailyEarning, EarningsSummary, EarningEntry } from '@/types/earnings';

const d = (daysAgo: number) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
};

// ─── TRANSACTIONS (20) ───────────────────────────────────────

export const mockTransactions: Transaction[] = [
  { id: 'tx-1', type: 'earning', missionId: 'c1', amount: 4.50, route: 'Nice → Cannes', pickupHub: 'Gare de Nice-Ville', deliveryHub: 'Gare de Cannes', packageTitle: 'Veste en cuir vintage', packageSize: 'M', packageWeight: 2.3, sellerName: 'Sophie Martin', buyerName: 'Lucas Dupont', pickupTime: '07:05', deliveryTime: '07:48', deliveryStatus: 'completed', rating: 5, date: d(0), reference: '#HTH-A1F2' },
  { id: 'tx-2', type: 'earning', missionId: 'c2', amount: 5.60, route: 'Nice → Marseille', pickupHub: 'Gare de Nice-Ville', deliveryHub: 'Gare Saint-Charles', packageTitle: 'Livre ancien', packageSize: 'S', packageWeight: 0.8, sellerName: 'Marie Leroy', buyerName: 'Pierre Moreau', pickupTime: '08:30', deliveryTime: '11:12', deliveryStatus: 'completed', rating: 5, date: d(1), reference: '#HTH-B3D4' },
  { id: 'tx-3', type: 'earning', missionId: 'c3', amount: 3.20, route: 'Nice → Cannes', pickupHub: 'TNT Centre Nice', deliveryHub: 'Relais Palais des Festivals', packageTitle: 'Bijoux artisanaux', packageSize: 'XS', packageWeight: 0.2, sellerName: 'Claire Bernard', buyerName: 'Thomas Petit', pickupTime: '07:05', deliveryTime: '08:02', deliveryStatus: 'completed', rating: 4, date: d(2), reference: '#HTH-C5E6' },
  { id: 'tx-4', type: 'earning', missionId: 'c4', amount: 7.00, route: 'Nice → Marseille', pickupHub: 'Gare de Nice-Ville', deliveryHub: 'Point Relais Vieux-Port', packageTitle: 'Console de jeux rétro', packageSize: 'M', packageWeight: 2.0, sellerName: 'Antoine Roux', buyerName: 'Emma Garcia', pickupTime: '08:30', deliveryTime: '11:15', deliveryStatus: 'completed', rating: 5, date: d(3), reference: '#HTH-D7F8' },
  { id: 'tx-5', type: 'cancelled', missionId: 'c5', amount: 0, route: 'Antibes → Nice', pickupHub: "Gare d'Antibes", deliveryHub: 'Gare de Nice-Ville', packageTitle: 'Sac à main designer', packageSize: 'S', packageWeight: 1.2, sellerName: 'Julie Fournier', buyerName: 'Maxime Robert', deliveryStatus: 'cancelled', date: d(4), reference: '#HTH-E9A0' },
  { id: 'tx-6', type: 'earning', missionId: 'c6', amount: 4.00, route: 'Nice → Cannes', pickupHub: 'Gare de Nice-Ville', deliveryHub: 'Gare de Cannes', packageTitle: 'Chaussures running', packageSize: 'M', packageWeight: 1.0, sellerName: 'Léa Dubois', buyerName: 'Hugo Lambert', pickupTime: '07:05', deliveryTime: '07:50', deliveryStatus: 'completed', rating: 5, date: d(5), reference: '#HTH-F1B2' },
  { id: 'tx-7', type: 'earning', missionId: 'c7', amount: 3.50, route: 'Nice → Cannes', pickupHub: 'TNT Centre Nice', deliveryHub: 'Relais Palais des Festivals', packageTitle: 'Appareil photo argentique', packageSize: 'S', packageWeight: 0.6, sellerName: 'Camille Rousseau', buyerName: 'Nathan Garnier', pickupTime: '07:05', deliveryTime: '08:00', deliveryStatus: 'completed', rating: 4, date: d(6), reference: '#HTH-G3C4' },
  { id: 'tx-8', type: 'earning', missionId: 'c8', amount: 6.40, route: 'Nice → Marseille', pickupHub: 'Gare de Nice-Ville', deliveryHub: 'Gare Saint-Charles', packageTitle: 'Tableau encadré', packageSize: 'L', packageWeight: 3.5, sellerName: 'Sophie Martin', buyerName: 'Emma Garcia', pickupTime: '08:30', deliveryTime: '11:08', deliveryStatus: 'completed', rating: 5, date: d(7), reference: '#HTH-H5D6' },
  { id: 'tx-9', type: 'cancelled', missionId: 'c9', amount: 0, route: 'Nice → Cannes', pickupHub: 'Gare de Nice-Ville', deliveryHub: 'Gare de Cannes', packageTitle: 'Casque audio', packageSize: 'S', packageWeight: 0.4, sellerName: 'Marie Leroy', buyerName: 'Thomas Petit', deliveryStatus: 'cancelled', date: d(8), reference: '#HTH-I7E8' },
  { id: 'tx-10', type: 'earning', missionId: 'c10', amount: 5.20, route: 'Nice → Marseille', pickupHub: 'Gare de Nice-Ville', deliveryHub: 'CC Les Valentines', packageTitle: 'Vêtements bébé lot', packageSize: 'M', packageWeight: 1.8, sellerName: 'Antoine Roux', buyerName: 'Hugo Lambert', pickupTime: '08:30', deliveryTime: '11:20', deliveryStatus: 'completed', rating: 5, date: d(9), reference: '#HTH-J9F0' },
  { id: 'tx-11', type: 'earning', missionId: 'c11', amount: 3.00, route: 'Nice → Cannes', pickupHub: 'Gare de Nice-Ville', deliveryHub: 'Gare de Cannes', packageTitle: 'Lunettes de soleil', packageSize: 'XS', packageWeight: 0.1, sellerName: 'Claire Bernard', buyerName: 'Lucas Dupont', pickupTime: '07:05', deliveryTime: '07:46', deliveryStatus: 'completed', rating: 5, date: d(10), reference: '#HTH-K1A2' },
  { id: 'tx-12', type: 'earning', missionId: 'c12', amount: 4.80, route: 'Antibes → Nice', pickupHub: "Gare d'Antibes", deliveryHub: 'TNT Centre Nice', packageTitle: 'Enceinte bluetooth', packageSize: 'S', packageWeight: 0.8, sellerName: 'Julie Fournier', buyerName: 'Pierre Moreau', pickupTime: '17:30', deliveryTime: '18:15', deliveryStatus: 'completed', rating: 4, date: d(12), reference: '#HTH-L3B4' },
  { id: 'tx-13', type: 'earning', missionId: 'c13', amount: 7.60, route: 'Nice → Marseille', pickupHub: 'Gare de Nice-Ville', deliveryHub: 'Gare Saint-Charles', packageTitle: 'Machine à café manuelle', packageSize: 'M', packageWeight: 2.5, sellerName: 'Léa Dubois', buyerName: 'Emma Garcia', pickupTime: '08:30', deliveryTime: '11:10', deliveryStatus: 'completed', rating: 5, date: d(14), reference: '#HTH-M5C6' },
  { id: 'tx-14', type: 'earning', missionId: 'c14', amount: 3.80, route: 'Nice → Cannes', pickupHub: 'TNT Centre Nice', deliveryHub: 'Gare de Cannes', packageTitle: 'Montre vintage', packageSize: 'XS', packageWeight: 0.15, sellerName: 'Camille Rousseau', buyerName: 'Maxime Robert', pickupTime: '07:05', deliveryTime: '07:52', deliveryStatus: 'completed', rating: 5, date: d(16), reference: '#HTH-N7D8' },
  { id: 'tx-15', type: 'earning', missionId: 'c15', amount: 5.00, route: 'Nice → Marseille', pickupHub: 'Gare de Nice-Ville', deliveryHub: 'Point Relais Vieux-Port', packageTitle: 'Skateboard', packageSize: 'L', packageWeight: 3.0, sellerName: 'Sophie Martin', buyerName: 'Nathan Garnier', pickupTime: '08:30', deliveryTime: '11:18', deliveryStatus: 'completed', rating: 5, date: d(18), reference: '#HTH-O9E0' },
  { id: 'tx-16', type: 'earning', missionId: 'c16', amount: 4.20, route: 'Nice → Cannes', pickupHub: 'Gare de Nice-Ville', deliveryHub: 'Relais Palais des Festivals', packageTitle: 'Parfum collection', packageSize: 'XS', packageWeight: 0.3, sellerName: 'Marie Leroy', buyerName: 'Thomas Petit', pickupTime: '07:05', deliveryTime: '08:05', deliveryStatus: 'completed', rating: 4, date: d(20), reference: '#HTH-P1F2' },
  { id: 'tx-17', type: 'earning', missionId: 'c17', amount: 6.00, route: 'Nice → Marseille', pickupHub: 'Gare de Nice-Ville', deliveryHub: 'Gare Saint-Charles', packageTitle: 'Drone mini', packageSize: 'S', packageWeight: 0.5, sellerName: 'Antoine Roux', buyerName: 'Hugo Lambert', pickupTime: '08:30', deliveryTime: '11:05', deliveryStatus: 'completed', rating: 5, date: d(22), reference: '#HTH-Q3A4' },
  { id: 'tx-18', type: 'earning', missionId: 'c18', amount: 3.60, route: 'Nice → Cannes', pickupHub: 'TNT Centre Nice', deliveryHub: 'Gare de Cannes', packageTitle: 'Livres cuisine lot', packageSize: 'M', packageWeight: 2.2, sellerName: 'Claire Bernard', buyerName: 'Lucas Dupont', pickupTime: '07:05', deliveryTime: '07:55', deliveryStatus: 'completed', rating: 5, date: d(24), reference: '#HTH-R5B6' },
  { id: 'tx-19', type: 'earning', amount: 4.40, route: 'Antibes → Nice', pickupHub: "Gare d'Antibes", deliveryHub: 'Gare de Nice-Ville', packageTitle: 'Vinyle collector', packageSize: 'M', packageWeight: 0.4, sellerName: 'Julie Fournier', buyerName: 'Pierre Moreau', pickupTime: '17:30', deliveryTime: '18:10', deliveryStatus: 'completed', rating: 5, date: d(26), reference: '#HTH-S7C8' },
  { id: 'tx-20', type: 'earning', amount: 5.80, route: 'Nice → Marseille', pickupHub: 'Gare de Nice-Ville', deliveryHub: 'CC Les Valentines', packageTitle: 'Tapis yoga premium', packageSize: 'L', packageWeight: 2.8, sellerName: 'Léa Dubois', buyerName: 'Emma Garcia', pickupTime: '08:30', deliveryTime: '11:22', deliveryStatus: 'completed', rating: 5, date: d(28), reference: '#HTH-T9D0' },
];

// ─── STATS ───────────────────────────────────────────────────

export const mockStats: EarningsStats = {
  totalDeliveries: 47,
  successRate: 96,
  totalEarnings: 215.50,
  averageRating: 4.8,
};

// ─── DAILY EARNINGS (last 7 days) ────────────────────────────

export const mockDailyEarnings: DailyEarning[] = [
  { date: d(6), amount: 3.50, deliveries: 1 },
  { date: d(5), amount: 4.00, deliveries: 1 },
  { date: d(4), amount: 0, deliveries: 0 },
  { date: d(3), amount: 7.00, deliveries: 1 },
  { date: d(2), amount: 3.20, deliveries: 1 },
  { date: d(1), amount: 5.60, deliveries: 1 },
  { date: d(0), amount: 4.50, deliveries: 1 },
];

// ─── SUMMARY ─────────────────────────────────────────────────

export const mockEarningsSummary: EarningsSummary = {
  balance: 127.50,
  todayEarnings: 4.50,
  weekEarnings: 27.80,
  monthEarnings: 68.40,
  totalEarnings: 215.50,
  totalMissions: 47,
  availableBalance: 127.50,
  pendingBalance: 18.60,
  withdrawnTotal: 69.40,
  thisMonth: 68.40,
  lastMonth: 89.40,
};

// Legacy compat
export const mockEarnings: EarningEntry[] = mockTransactions
  .filter((t) => t.type === 'earning')
  .slice(0, 6)
  .map((t) => ({
    id: t.id,
    missionId: t.missionId ?? t.id,
    amount: t.amount,
    date: t.date,
    status: 'available' as const,
    description: `${t.route} — ${t.packageTitle}`,
  }));
