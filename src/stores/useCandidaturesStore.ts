// LES PROPOSITIONS ET LES CANDIDATURES DU COTRANSPORTEUR — § 5 des CGU H2H Logistic.
//
// ⚠️ À CÔTÉ DE `useMissionStore`, PAS DEDANS. Une proposition de la mise en
// relation n'est pas une mission : elle n'a ni colis attribué, ni vendeur connu,
// ni statut projeté depuis `shipments`. La mission n'existe qu'à la confirmation —
// elle apparaît alors dans `useMissionStore`, comme toutes les autres.
//
// ⚠️ RIEN NE CHANGE D'ÉTAT ICI. Chaque geste part au serveur, puis on relit : le
// délai de vingt minutes, la marge d'une heure trente, « une seule candidature en
// attente » — tout cela se décide en base, au moment du geste.
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import type { Candidature } from '@/types/candidature';
import {
  accepterProposition,
  chargerJoursFermes,
  chargerMesPropositions,
  fermerLaJournee,
  refuserProposition,
  retirerCandidature,
  rouvrirLaJournee,
} from '@/services/candidatures';
import { sequenceur } from '@/utils/derniereLectureGagne';

// 🔴 PLUSIEURS ÉCRANS RELISENT (l'onglet, sa relecture de fond, l'écran de la
// proposition, l'accueil) — voir `derniereLectureGagne` : la plus récente gagne.
const lectures = sequenceur();

interface CandidaturesState {
  candidatures: Candidature[];
  /** Les jours « Pas aujourd'hui » à venir, en dates de Paris. */
  joursFermes: string[];
  isLoading: boolean;
  /** Le refus de LECTURE — un geste refusé, lui, se montre à l'appelant. */
  erreur: string | null;
  /** La candidature dont un geste est en cours d'envoi. */
  enCours: string | null;

  charger: () => Promise<void>;
  accepter: (id: string, routeId: string, collecteLe: string) => Promise<void>;
  refuser: (id: string, motif?: string) => Promise<void>;
  retirer: (id: string) => Promise<void>;
  fermerJour: (jour: string) => Promise<void>;
  rouvrirJour: (jour: string) => Promise<void>;
  /** À la déconnexion : rien du compte précédent ne reste à l'écran. */
  vider: () => void;
}

// ─── CE QUE LES ÉCRANS LISENT — des fonctions PURES de l'état ───────────────
// (même raison que `useMissionStore` : le React Compiler mémoïse les getters.)
type Lu = Pick<CandidaturesState, 'candidatures'>;

export const selectPropositions = (s: Lu): Candidature[] =>
  s.candidatures.filter((c) => c.statut === 'proposee');

/** Acceptées, en attente d'une décision de l'acheteur ou du vendeur. */
export const selectCandidaturesEnCours = (s: Lu): Candidature[] =>
  s.candidatures.filter((c) => c.statut === 'en_attente' || c.statut === 'non_selectionnee' || c.statut === 'retenue');

export const selectConfirmees = (s: Lu): Candidature[] =>
  s.candidatures.filter((c) => c.statut === 'confirmee');

export const findCandidature = (s: Lu, id: string): Candidature | undefined =>
  s.candidatures.find((c) => c.id === id);

/** Un geste, puis une relecture — et le refus du serveur remonte à l'écran. */
async function geste(
  set: (p: Partial<CandidaturesState>) => void,
  get: () => CandidaturesState,
  id: string,
  envoi: () => Promise<void>,
): Promise<void> {
  set({ enCours: id });
  try {
    await envoi();
  } finally {
    set({ enCours: null });
    // ⚠️ ON RELIT MÊME APRÈS UN REFUS : un refus dit souvent que l'écran est
    // périmé (délai passé, candidature déjà choisie) — la relecture le corrige.
    await get().charger();
  }
}

export const useCandidaturesStore = create<CandidaturesState>((set, get) => ({
  candidatures: [],
  joursFermes: [],
  isLoading: false,
  erreur: null,
  enCours: null,

  charger: async () => {
    const jeton = lectures.demarrer();
    set({ isLoading: true, erreur: null });
    try {
      const [candidatures, joursFermes] = await Promise.all([chargerMesPropositions(), chargerJoursFermes()]);
      if (lectures.estPerimee(jeton)) return;
      set({ candidatures, joursFermes, isLoading: false });
    } catch (e) {
      if (lectures.estPerimee(jeton)) return;
      // 🔴 UN REFUS DE LECTURE N'EST PAS UNE LISTE VIDE : on garde la dernière
      // liste connue et on dit que la lecture a échoué.
      set({ isLoading: false, erreur: e instanceof Error ? e.message : 'Propositions indisponibles' });
    }
  },

  accepter: (id, routeId, collecteLe) => geste(set, get, id, () => accepterProposition(id, routeId, collecteLe)),
  refuser: (id, motif) => geste(set, get, id, () => refuserProposition(id, motif)),
  retirer: (id) => geste(set, get, id, () => retirerCandidature(id)),
  fermerJour: (jour) => geste(set, get, jour, () => fermerLaJournee(jour)),
  rouvrirJour: (jour) => geste(set, get, jour, () => rouvrirLaJournee(jour)),

  vider: () => {
    // Une lecture partie avant la déconnexion ne doit pas réécrire la liste vidée.
    lectures.demarrer();
    set({ candidatures: [], joursFermes: [], isLoading: false, erreur: null, enCours: null });
  },
}));

// ─── LES CROCHETS — la seule lecture permise pendant un rendu ───────────────
export const usePropositions = (): Candidature[] => useCandidaturesStore(useShallow(selectPropositions));
export const useCandidaturesEnCours = (): Candidature[] =>
  useCandidaturesStore(useShallow(selectCandidaturesEnCours));
export const useConfirmees = (): Candidature[] => useCandidaturesStore(useShallow(selectConfirmees));
export const useCandidature = (id: string | undefined): Candidature | undefined =>
  useCandidaturesStore((s) => (id ? findCandidature(s, id) : undefined));
export const useJoursFermes = (): string[] => useCandidaturesStore((s) => s.joursFermes);
