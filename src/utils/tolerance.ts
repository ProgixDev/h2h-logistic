// LA TOLÉRANCE VIENT DE LA MISSION — ELLE N'A PAS DE VALEUR PAR DÉFAUT ICI.
//
// 🔴 CE QUI A CHANGÉ LE 07/09/2026, ET POURQUOI. Ces quatre fonctions
// prenaient `toleranceMinutes = DEFAULT_TOLERANCE_MINUTES`, une constante à 10.
// Un appelant qui oubliait le paramètre obtenait donc 10 SANS ERREUR, pour une
// mission qui pouvait en porter quinze. C'est exactement le défaut pour lequel
// `hand-to-hand/src/utils/tolerance.ts` a été SUPPRIMÉ le même jour.
//
// ⚠️ LE PARAMÈTRE EST DÉSORMAIS OBLIGATOIRE. Il ne s'agit pas de rigueur pour
// la forme : `missions.tolerance_minutes` est une COLONNE (`smallint not null
// default 10`), et une valeur par défaut n'est pas une constante. En le rendant
// obligatoire, une mission à quinze minutes ne peut plus s'afficher à dix — le
// compilateur refuse l'appel qui aurait menti.
//
// ⚠️ ET IL Y A DEUX TOLÉRANCES CÔTÉ SERVEUR, QU'IL NE FAUT PAS CONFONDRE :
//   • `missions.tolerance_minutes` — par mission, ce que les trois parties
//     voient à l'écran et ce que ce module calcule ;
//   • `ref.delay_protocol.tolerance_minutes` — la configuration globale, que
//     `app.tg_incident_admissibility` applique pour décider si une déclaration
//     d'absence est recevable.
// Elles valent 10 toutes les deux aujourd'hui. Ce n'est pas une raison pour en
// déduire l'autre : la première est versionnée par ligne, la seconde par
// `effective_from`.
import dayjs from 'dayjs';

/** Les bornes de la fenêtre, et si l'on s'y trouve. */
export function getToleranceWindow(
  scheduledTime: string,
  toleranceMinutes: number,
): { start: string; end: string; isWithin: boolean } {
  const scheduled = dayjs(scheduledTime);
  const start = scheduled.subtract(toleranceMinutes, 'minute');
  const end = scheduled.add(toleranceMinutes, 'minute');
  const now = dayjs();

  return {
    start: start.format('HH:mm'),
    end: end.format('HH:mm'),
    isWithin: now.isAfter(start) && now.isBefore(end),
  };
}

export function isWithinTolerance(scheduledTime: string, toleranceMinutes: number): boolean {
  const diffMinutes = Math.abs(dayjs().diff(dayjs(scheduledTime), 'minute'));
  return diffMinutes <= toleranceMinutes;
}

/**
 * La tolérance est-elle ÉCOULÉE ? (au-delà de l'heure prévue + tolérance)
 *
 * 🔴 C'EST LA CONDITION QUI OUVRE LE SIGNALEMENT D'ABSENCE. Règle client du
 * 12/08/2026 : pendant le créneau, l'autre partie a le droit d'arriver — la
 * déclarer absente à la 3ᵉ minute est un signalement contre quelqu'un qui n'est
 * pas encore en retard. Ce n'est qu'après la tolérance que l'absence est un fait.
 *
 * ⚠️ NE PAS CONFONDRE AVEC `!isWithinTolerance` : celui-ci est vrai AVANT le
 * créneau comme après. Ici seul l'APRÈS compte — sinon les signalements
 * s'ouvriraient la veille du rendez-vous.
 */
export function isAfterTolerance(scheduledTime: string, toleranceMinutes: number): boolean {
  return dayjs().diff(dayjs(scheduledTime), 'minute', true) > toleranceMinutes;
}

/**
 * La tolérance, dite en toutes lettres dans un libellé.
 *
 * 🔴 POURQUOI CE DÉTOUR PLUTÔT QU'UN NOMBRE ÉCRIT DANS LE TEXTE. Trois
 * questions de formulaire demandaient « avez-vous attendu la fin de la
 * tolérance de 10 minutes ? » — à quelqu'un dont la mission pouvait en porter
 * quinze. La réponse était alors enregistrée comme une preuve, sur une question
 * qui n'était pas la bonne.
 *
 * ⚠️ ET QUAND LA MISSION EST INCONNUE, ON NE DEVINE PAS. L'écran de formulaire
 * s'ouvre parfois sans mission chargée ; écrire « 10 » à ce moment-là serait
 * rouvrir le défaut sous une autre forme. On dit « la tolérance autorisée »,
 * les mots que le reste du protocole emploie déjà.
 */
export function phraseTolerance(toleranceMinutes?: number): string {
  return toleranceMinutes === undefined
    ? 'tolérance autorisée'
    : `tolérance de ${toleranceMinutes} minutes`;
}

/** Le jeton que `phraseTolerance` remplace dans les libellés de formulaire. */
export const JETON_TOLERANCE = '{tolerance}';

/**
 * Remplace `{tolerance}` dans un libellé.
 *
 * ⚠️ TOUT JETON INCONNU LÈVE. Un `{quelque_chose}` qui traverserait
 * silencieusement s'afficherait tel quel à l'utilisateur, accolades comprises —
 * une garde qui échoue en produisant du texte cassé n'est pas une garde.
 */
export function interpolerLibelle(libelle: string, toleranceMinutes?: number): string {
  const rendu = libelle.split(JETON_TOLERANCE).join(phraseTolerance(toleranceMinutes));
  const restant = /\{[a-z_]+\}/i.exec(rendu);
  if (restant) {
    throw new Error(
      `libellé avec un jeton inconnu « ${restant[0]} » : ${libelle}`,
    );
  }
  return rendu;
}
