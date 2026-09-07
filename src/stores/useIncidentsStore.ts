// LE MAGASIN DES DÉCLARATIONS — IL NE FABRIQUE PLUS RIEN.
//
// 🔴 CE QU'IL FAISAIT JUSQU'AU 07/09/2026. `submitIncident` attendait 800 ms
// (`MOCK_SUBMIT_DELAY`), fabriquait `incident-${Date.now()}`, rangeait l'objet
// en mémoire — et l'écran affichait « Formulaire envoyé. » Douze formulaires ne
// quittaient jamais le téléphone.
//
// 🔴 ET IL SEMAIT DEUX DOSSIERS DE DÉMONSTRATION AU DÉMARRAGE, sur des missions
// `mission-a1` / `mission-a2` qui n'existent pas, avec un « Gare Saint-Charles »
// inventé. Ce n'était pas décoratif : `getIncidentsForMission` servait à
// trouver la déclaration visée par une contestation et à lire SA fenêtre de
// 24 h. L'écran mesurait donc des délais réels contre des dossiers imaginaires.
//
// ⚠️ LA LECTURE EST DEVENUE ASYNCHRONE, ET ELLE DEVAIT L'ÊTRE. Les dossiers
// vivent en base ; `incidentsDeMission` ne rend que ce qui a été CHARGÉ, et
// `chargerPourMission` doit être appelée avant. Un accesseur synchrone qui
// rendrait `[]` en attendant laisserait croire « aucune déclaration » là où la
// réponse est « on ne sait pas encore » — et rouvrirait une contestation déjà
// close.
import { create } from 'zustand';
import {
  chargerIncidentsDeMission,
  declarerIncident,
  type BrouillonIncident,
  type IncidentDepose,
} from '@/services/incidents';

interface IncidentsState {
  /** Par mission, et seulement ce qui a été chargé. */
  parMission: Record<string, IncidentDepose[]>;
  /** Les missions dont le chargement a abouti — `{}` ne veut pas dire « aucun ». */
  chargees: Record<string, boolean>;
  isSubmitting: boolean;
  erreur: string | null;

  chargerPourMission: (missionId: string) => Promise<void>;
  declarer: (brouillon: BrouillonIncident) => Promise<IncidentDepose>;
  incidentsDeMission: (missionId: string) => IncidentDepose[];
  estCharge: (missionId: string) => boolean;
}

export const useIncidentsStore = create<IncidentsState>((set, get) => ({
  parMission: {},
  chargees: {},
  isSubmitting: false,
  erreur: null,

  chargerPourMission: async (missionId) => {
    if (!missionId) return;
    try {
      const lignes = await chargerIncidentsDeMission(missionId);
      set((s) => ({
        parMission: { ...s.parMission, [missionId]: lignes },
        chargees: { ...s.chargees, [missionId]: true },
        erreur: null,
      }));
    } catch (e) {
      // ⚠️ ON NE MARQUE PAS « CHARGÉ » SUR UN ÉCHEC. Le dire reviendrait à
      // affirmer qu'il n'y a aucune déclaration, alors qu'on n'en sait rien.
      set({ erreur: e instanceof Error ? e.message : 'Déclarations indisponibles' });
    }
  },

  declarer: async (brouillon) => {
    set({ isSubmitting: true, erreur: null });
    try {
      const depose = await declarerIncident(brouillon);
      set((s) => ({
        parMission: {
          ...s.parMission,
          [brouillon.missionId]: [depose, ...(s.parMission[brouillon.missionId] ?? [])],
        },
        isSubmitting: false,
      }));
      return depose;
    } catch (e) {
      set({ isSubmitting: false, erreur: e instanceof Error ? e.message : 'Envoi impossible' });
      throw e;
    }
  },

  incidentsDeMission: (missionId) => get().parMission[missionId] ?? [],
  estCharge: (missionId) => get().chargees[missionId] === true,
}));
