export interface AppNotification {
  id: string;
  type: 'mission_new' | 'mission_update' | 'earning' | 'system' | 'route';
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  data?: Record<string, string>;
}

export const mockNotifications: AppNotification[] = [
  {
    id: 'notif-1',
    type: 'mission_new',
    title: 'Nouvelle co-livraison disponible',
    body: 'Un colis à livrer sur votre trajet Paris → Lyon de demain.',
    read: false,
    createdAt: '2026-04-09T06:00:00Z',
    data: { missionId: 'mission-3' },
  },
  {
    id: 'notif-2',
    type: 'mission_update',
    title: 'Colis prêt à récupérer',
    body: 'Le vendeur a déposé le colis au hub Relais Colis Paris 11.',
    read: false,
    createdAt: '2026-04-09T07:45:00Z',
    data: { missionId: 'mission-1' },
  },
  {
    id: 'notif-3',
    type: 'earning',
    title: 'Participation reçue',
    body: '6,30 € crédités pour la co-livraison du 07/04.',
    read: true,
    createdAt: '2026-04-08T10:00:00Z',
    data: { earningId: 'earn-2' },
  },
  {
    id: 'notif-4',
    type: 'route',
    title: 'Trajet expiré',
    body: 'Votre trajet ponctuel Paris → Bordeaux du 05/04 a expiré.',
    read: true,
    createdAt: '2026-04-06T00:00:00Z',
  },
  {
    id: 'notif-5',
    type: 'system',
    title: 'Bienvenue sur H2H Logistic !',
    body: 'Publiez votre premier trajet pour commencer à recevoir des co-livraisons.',
    read: true,
    createdAt: '2026-03-01T10:00:00Z',
  },
];
