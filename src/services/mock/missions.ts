import type { Mission } from '@/types/mission';

const now = new Date();
const in15m = new Date(now.getTime() + 15 * 60000).toISOString();
const in25m = new Date(now.getTime() + 25 * 60000).toISOString();
const tomorrow = new Date(now.getTime() + 24 * 3600000);
const tomorrowAt = (h: number, m: number) => {
  const d = new Date(tomorrow);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000).toISOString();

const transporter = { id: 'user-1', name: 'Karim Benzarti', phone: '+33 6 55 44 33 22', role: 'transporter' as const, rating: 4.8 };

// ─── PROPOSALS (2) ────────────────────────────────────────────

export const mockProposals: Mission[] = [
  {
    id: 'prop-1',
    routeId: 'route-1',
    status: 'proposal',
    seller: { id: 'seller-1', name: 'Sophie Martin', phone: '+33 6 12 34 56 78', role: 'seller', rating: 4.9, avatar: 'https://i.pravatar.cc/150?img=5', qrCode: 'SEL-5M01' },
    buyer: { id: 'buyer-1', name: 'Lucas Dupont', phone: '+33 6 98 76 54 32', role: 'buyer', rating: 4.7, isFavorite: true, avatar: 'https://i.pravatar.cc/150?img=12', qrCode: 'BUY-L1D2' },
    transporter,
    package: { id: 'pkg-p1', description: 'Veste en cuir vintage', size: 'M', weight: 2.3, condition: 'Très bon état', thumbnail: '', trackingNumber: 'HTH-P10N1' },
    pickupHub: { id: 'hub-nice-gare', name: 'Gare de Nice-Ville', city: 'Nice', scheduledTime: tomorrowAt(7, 5), toleranceMinutes: 10 },
    deliveryHub: { id: 'hub-mrs-gare', name: 'Gare Saint-Charles', city: 'Marseille', scheduledTime: tomorrowAt(11, 10), toleranceMinutes: 10 },
    price: 5.63,
    transporterEarning: 4.50,
    platformFee: 1.13,
    proposalExpiresAt: in15m,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  },
  {
    id: 'prop-2',
    routeId: 'route-1',
    status: 'proposal',
    seller: { id: 'seller-2', name: 'Marie Leroy', phone: '+33 6 11 22 33 44', role: 'seller', rating: 4.6, avatar: 'https://i.pravatar.cc/150?img=9', qrCode: 'SEL-M2L3' },
    buyer: { id: 'buyer-2', name: 'Pierre Moreau', phone: '+33 6 77 88 99 00', role: 'buyer', rating: 4.8, avatar: 'https://i.pravatar.cc/150?img=15', qrCode: 'BUY-P2M4' },
    transporter,
    package: { id: 'pkg-p2', description: 'Livre ancien édition limitée', size: 'S', weight: 0.8, condition: 'Bon état', thumbnail: '', trackingNumber: 'HTH-P20N2' },
    pickupHub: { id: 'hub-nice-gare', name: 'Gare de Nice-Ville', city: 'Nice', scheduledTime: tomorrowAt(7, 5), toleranceMinutes: 10 },
    deliveryHub: { id: 'hub-cannes-gare', name: 'Gare de Cannes', city: 'Cannes', scheduledTime: tomorrowAt(7, 45), toleranceMinutes: 10 },
    price: 3.75,
    transporterEarning: 3.00,
    platformFee: 0.75,
    proposalExpiresAt: in25m,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  },
];

// ─── ACTIVE MISSIONS (2) ─────────────────────────────────────

export const mockActiveMissions: Mission[] = [
  {
    id: 'mission-a1',
    routeId: 'route-1',
    status: 'in_transit',
    seller: { id: 'seller-3', name: 'Claire Bernard', phone: '+33 6 22 33 44 55', role: 'seller', rating: 4.5, avatar: 'https://i.pravatar.cc/150?img=20', qrCode: 'SEL-C3B5' },
    buyer: { id: 'buyer-3', name: 'Thomas Petit', phone: '+33 6 66 77 88 99', role: 'buyer', rating: 4.9, avatar: 'https://i.pravatar.cc/150?img=11', qrCode: 'BUY-T3P6' },
    transporter,
    package: { id: 'pkg-a1', description: 'Console de jeux rétro', size: 'M', weight: 2.0, thumbnail: '', trackingNumber: 'HTH-A10N1' },
    pickupHub: { id: 'hub-nice-gare', name: 'Gare de Nice-Ville', city: 'Nice', scheduledTime: now.toISOString(), toleranceMinutes: 10, actualTime: now.toISOString(), qrCode: 'H2H-PKG-A1-ABCD' },
    deliveryHub: { id: 'hub-mrs-gare', name: 'Gare Saint-Charles', city: 'Marseille', scheduledTime: tomorrowAt(11, 10), toleranceMinutes: 10, otpCode: '482916' },
    price: 7.50,
    transporterEarning: 6.00,
    platformFee: 1.50,
    createdAt: daysAgo(1),
    updatedAt: now.toISOString(),
  },
  {
    id: 'mission-a2',
    routeId: 'route-3',
    status: 'pickup_pending',
    seller: { id: 'seller-4', name: 'Antoine Roux', phone: '+33 6 33 44 55 66', role: 'seller', rating: 4.3, avatar: 'https://i.pravatar.cc/150?img=13', qrCode: 'SEL-A4R7' },
    buyer: { id: 'buyer-4', name: 'Emma Garcia', phone: '+33 6 88 99 00 11', role: 'buyer', rating: 5.0, isFavorite: true, avatar: 'https://i.pravatar.cc/150?img=16', qrCode: 'BUY-E4G8' },
    transporter,
    package: { id: 'pkg-a2', description: 'Sac à main designer', size: 'S', weight: 1.2, thumbnail: '', trackingNumber: 'HTH-A20N2' },
    pickupHub: { id: 'hub-antibes-gare', name: "Gare d'Antibes", city: 'Antibes', scheduledTime: tomorrowAt(17, 30), toleranceMinutes: 10, qrCode: 'H2H-PKG-A2-EFGH' },
    deliveryHub: { id: 'hub-nice-gare', name: 'Gare de Nice-Ville', city: 'Nice', scheduledTime: tomorrowAt(18, 0), toleranceMinutes: 10, otpCode: '173845' },
    price: 5.00,
    transporterEarning: 4.00,
    platformFee: 1.00,
    createdAt: daysAgo(0),
    updatedAt: daysAgo(0),
  },
  {
    id: 'mission-a3',
    routeId: 'route-2',
    status: 'delivery_pending',
    seller: { id: 'seller-8', name: 'Hélène Vidal', phone: '+33 6 77 88 99 00', role: 'seller', rating: 4.7, avatar: 'https://i.pravatar.cc/150?img=25', qrCode: 'SEL-H8V4' },
    buyer: { id: 'buyer-8', name: 'Yanis Mercier', phone: '+33 6 44 55 66 77', role: 'buyer', rating: 4.8, avatar: 'https://i.pravatar.cc/150?img=33', qrCode: 'BUY-Y8M5' },
    transporter,
    package: { id: 'pkg-a3', description: 'Casque audio sans fil', size: 'S', weight: 0.7, thumbnail: '', trackingNumber: 'HTH-A30N3' },
    pickupHub: { id: 'hub-nice-gare', name: 'Gare de Nice-Ville', city: 'Nice', scheduledTime: now.toISOString(), toleranceMinutes: 10, actualTime: now.toISOString(), qrCode: 'H2H-PKG-A3-IJKL' },
    deliveryHub: { id: 'hub-cannes-gare', name: 'Gare de Cannes', city: 'Cannes', scheduledTime: in25m, toleranceMinutes: 10, otpCode: '305471' },
    price: 4.38,
    transporterEarning: 3.50,
    platformFee: 0.88,
    createdAt: daysAgo(0),
    updatedAt: now.toISOString(),
  },
  {
    id: 'mission-a5',
    routeId: 'route-2',
    status: 'deposited',
    seller: { id: 'seller-10', name: 'Olivier Marchand', phone: '+33 6 88 77 66 55', role: 'seller', rating: 4.9, avatar: 'https://i.pravatar.cc/150?img=60', qrCode: 'SEL-O10M8' },
    buyer: { id: 'buyer-10', name: 'Inès Caron', phone: '+33 6 55 44 33 22', role: 'buyer', rating: 4.5, avatar: 'https://i.pravatar.cc/150?img=44', qrCode: 'BUY-I10C9' },
    transporter,
    package: { id: 'pkg-a5', description: 'Vinyle collector', size: 'S', weight: 0.4, thumbnail: '', trackingNumber: 'HTH-A50N5' },
    pickupHub: { id: 'hub-nice-gare', name: 'Gare de Nice-Ville', city: 'Nice', scheduledTime: daysAgo(0), toleranceMinutes: 10, actualTime: daysAgo(0), qrCode: 'H2H-PKG-A5-QRST' },
    deliveryHub: { id: 'hub-mrs-gare', name: 'Gare Saint-Charles', city: 'Marseille', scheduledTime: now.toISOString(), toleranceMinutes: 10, actualTime: now.toISOString(), otpCode: '917253' },
    price: 4.06,
    transporterEarning: 3.25,
    platformFee: 0.81,
    createdAt: daysAgo(1),
    updatedAt: now.toISOString(),
  },
  {
    id: 'mission-a4',
    routeId: 'route-3',
    status: 'in_transit',
    isReturn: true,
    seller: { id: 'seller-9', name: 'Damien Charpentier', phone: '+33 6 22 11 00 99', role: 'seller', rating: 4.4, avatar: 'https://i.pravatar.cc/150?img=52', qrCode: 'SEL-D9C6' },
    buyer: { id: 'buyer-9', name: 'Sarah Benali', phone: '+33 6 33 22 11 00', role: 'buyer', rating: 4.6, avatar: 'https://i.pravatar.cc/150?img=47', qrCode: 'BUY-S9B7' },
    transporter,
    package: { id: 'pkg-a4', description: 'Robe — refusée à la remise', size: 'S', weight: 0.9, thumbnail: '', trackingNumber: 'HTH-A40N4' },
    pickupHub: { id: 'hub-mrs-gare', name: 'Gare Saint-Charles', city: 'Marseille', scheduledTime: now.toISOString(), toleranceMinutes: 10, actualTime: now.toISOString(), qrCode: 'H2H-PKG-A4-MNOP' },
    deliveryHub: { id: 'hub-nice-gare', name: 'Gare de Nice-Ville', city: 'Nice', scheduledTime: tomorrowAt(9, 30), toleranceMinutes: 10, otpCode: '648219' },
    price: 3.13,
    transporterEarning: 2.50,
    platformFee: 0.63,
    createdAt: daysAgo(1),
    updatedAt: now.toISOString(),
  },
];

// ─── COMPLETED MISSIONS (3) ──────────────────────────────────

export const mockCompletedMissions: Mission[] = [
  {
    id: 'mission-c1',
    routeId: 'route-1',
    status: 'completed',
    seller: { id: 'seller-5', name: 'Julie Fournier', phone: '+33 6 44 55 66 77', role: 'seller', rating: 4.7, avatar: 'https://i.pravatar.cc/150?img=10', qrCode: 'SEL-J5F9' },
    buyer: { id: 'buyer-5', name: 'Maxime Robert', phone: '+33 6 99 00 11 22', role: 'buyer', rating: 4.6, avatar: 'https://i.pravatar.cc/150?img=8', qrCode: 'BUY-M5R0' },
    transporter,
    package: { id: 'pkg-c1', description: 'Appareil photo argentique', size: 'S', weight: 0.6, thumbnail: '', trackingNumber: 'HTH-C10N1' },
    pickupHub: { id: 'hub-nice-gare', name: 'Gare de Nice-Ville', city: 'Nice', scheduledTime: daysAgo(3), toleranceMinutes: 10, actualTime: daysAgo(3), qrCode: 'H2H-PKG-C1' },
    deliveryHub: { id: 'hub-cannes-gare', name: 'Gare de Cannes', city: 'Cannes', scheduledTime: daysAgo(3), toleranceMinutes: 10, actualTime: daysAgo(3), otpCode: '413672' },
    price: 4.38,
    transporterEarning: 3.50,
    platformFee: 0.88,
    createdAt: daysAgo(4),
    updatedAt: daysAgo(3),
  },
  {
    id: 'mission-c2',
    routeId: 'route-2',
    status: 'completed',
    seller: { id: 'seller-6', name: 'Léa Dubois', phone: '+33 6 55 66 77 88', role: 'seller', rating: 4.8, avatar: 'https://i.pravatar.cc/150?img=19', qrCode: 'SEL-L6D1' },
    buyer: { id: 'buyer-6', name: 'Hugo Lambert', phone: '+33 6 00 11 22 33', role: 'buyer', rating: 4.4, avatar: 'https://i.pravatar.cc/150?img=3', qrCode: 'BUY-H6L2' },
    transporter,
    package: { id: 'pkg-c2', description: 'Chaussures running neuves', size: 'M', weight: 1.0, thumbnail: '', trackingNumber: 'HTH-C20N2' },
    pickupHub: { id: 'hub-nice-gare', name: 'Gare de Nice-Ville', city: 'Nice', scheduledTime: daysAgo(5), toleranceMinutes: 10, actualTime: daysAgo(5), qrCode: 'H2H-PKG-C2' },
    deliveryHub: { id: 'hub-mrs-gare', name: 'Gare Saint-Charles', city: 'Marseille', scheduledTime: daysAgo(5), toleranceMinutes: 10, actualTime: daysAgo(5), otpCode: '758294' },
    price: 6.25,
    transporterEarning: 5.00,
    platformFee: 1.25,
    createdAt: daysAgo(6),
    updatedAt: daysAgo(5),
  },
  {
    id: 'mission-c3',
    routeId: 'route-1',
    status: 'completed',
    seller: { id: 'seller-7', name: 'Camille Rousseau', phone: '+33 6 66 77 88 99', role: 'seller', rating: 4.9, avatar: 'https://i.pravatar.cc/150?img=14', qrCode: 'SEL-C7R3' },
    buyer: { id: 'buyer-7', name: 'Nathan Garnier', phone: '+33 6 11 22 33 44', role: 'buyer', rating: 4.7, isFavorite: true, avatar: 'https://i.pravatar.cc/150?img=7', qrCode: 'BUY-N7G4' },
    transporter,
    package: { id: 'pkg-c3', description: 'Tableau encadré artiste local', size: 'L', weight: 3.5, thumbnail: '', trackingNumber: 'HTH-C30N3' },
    pickupHub: { id: 'hub-nice-tnt', name: 'TNT Centre Nice', city: 'Nice', scheduledTime: daysAgo(7), toleranceMinutes: 10, actualTime: daysAgo(7), qrCode: 'H2H-PKG-C3' },
    deliveryHub: { id: 'hub-cannes-palais', name: 'Relais Palais des Festivals', city: 'Cannes', scheduledTime: daysAgo(7), toleranceMinutes: 10, actualTime: daysAgo(7), otpCode: '926351' },
    price: 8.75,
    transporterEarning: 7.00,
    platformFee: 1.75,
    createdAt: daysAgo(8),
    updatedAt: daysAgo(7),
  },
];

// Legacy combined export for backward compatibility
export const mockMissions: Mission[] = [
  ...mockProposals,
  ...mockActiveMissions,
  ...mockCompletedMissions,
];
