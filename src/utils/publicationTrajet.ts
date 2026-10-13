// CE QUE LE SERVEUR REFUSE À LA PUBLICATION D'UN TRAJET, DIT EN MOTS.
//
// 🔴 « Impossible de publier le trajet. Veuillez réessayer. » NE DISAIT RIEN, ET
// RÉESSAYER NE SERVAIT À RIEN quand le refus est une règle. Depuis
// `20261013005000` (hand-to-hand), un point de rendez-vous que l'équipe a fermé
// ne se publie plus dans un trajet : la liste des points n'en propose aucun,
// mais un point peut se fermer entre le choix et la publication.

/** Le message à montrer quand `publier_trajet` refuse ; le message du serveur n'est jamais montré tel quel. */
export function messageDePublication(brut: string | null | undefined): string {
  const m = (brut ?? '').toLowerCase();
  if (m.includes('n est plus propose')) {
    return 'Un des points de rendez-vous choisis n’est plus proposé. Revenez aux points de collecte et de remise pour en choisir un autre.';
  }
  return 'Impossible de publier le trajet. Veuillez réessayer.';
}
