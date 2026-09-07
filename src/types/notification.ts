// LA NOTIFICATION TELLE QUE L'APPLICATION LA LIT.
//
// ⚠️ CE TYPE VIVAIT DANS `services/mock/notifications.ts`, à côté de cinq fausses
// notifications. `services/notifications.ts` lit la vraie table `notifications`
// depuis le 06/09/2026 — mais continuait d'importer sa FORME depuis le fichier de
// démonstration. Le type est réel, son voisinage ne l'était pas.
export interface AppNotification {
  id: string;
  type: 'mission_new' | 'mission_update' | 'earning' | 'system' | 'route';
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  data?: Record<string, string>;
}
