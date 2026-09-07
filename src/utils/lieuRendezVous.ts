// COMMENT ON NOMME UN POINT DE RENDEZ-VOUS DANS UNE PHRASE.
//
// 🔴 LE NOM D'UN HUB PORTE DÉJÀ SON « Hub ». C'est une colonne GÉNÉRÉE par la
// base — `'Hub ' || type de lieu || repère` — et `types/hub.ts` l'écrit noir sur
// blanc : « JAMAIS RECOMPOSÉ, JAMAIS AMPUTÉ DE SON "Hub" ». Un gabarit
// « au hub {nom} » le redouble donc, et c'est ce qui s'affichait :
//
//     « Hub Hub Gare de Nice-Ville »          (bandeau ACTION SUIVANTE)
//     « Remise prévue … au hub Hub Gare … »   (rappel d'horaire)
//
// 🔴 ET L'AUTRE MOITIÉ DU MÊME DÉFAUT EST PIRE. Hors hub, `pointDeRencontre`
// ne met pas un nom de hub dans `name` : il y met l'ADRESSE convenue, ou la
// mention « Remise en main propre » quand il n'y en a pas. Le même gabarit
// produisait alors :
//
//     « … au hub Remise en main propre »
//
// c'est-à-dire une phrase qui appelle « hub » un rendez-vous dont tout l'intérêt
// est de ne pas en être un.
//
// ⚠️ D'OÙ CE MODULE PLUTÔT QU'UN `replace()`. La place de marché avait choisi
// l'autre voie — un `stripHubPrefix` qui retirait le mot — et retirer est aussi
// faux qu'ajouter : le protocole rend ce mot PORTEUR. Ici on ne touche jamais au
// nom ; c'est la PHRASE AUTOUR qui cesse de dire « hub ».

/** Ce dont ces fonctions ont besoin — un sous-ensemble de `MissionHub`. */
export type LieuRendezVous = {
  name: string;
  isOffHub?: boolean;
  offHubAddress?: string;
};

/** Un rendez-vous hors hub SANS adresse : il n'y a pas de lieu à nommer. */
const enMainPropre = (lieu: LieuRendezVous): boolean =>
  lieu.isOffHub === true && !lieu.offHubAddress;

/**
 * Le nom, TEL QUEL. Existe pour qu'un appelant n'ait pas à se demander s'il
 * doit préfixer quoi que ce soit : la réponse est toujours non.
 */
export function nomDuLieu(lieu: LieuRendezVous): string {
  return lieu.name;
}

/**
 * Le complément de lieu d'une phrase : « … à 16h36 {auLieu(hub)} ».
 *
 *   hub            → « au Hub Gare de Nice-Ville »
 *   hors hub + adr → « au 12 avenue Thiers, Nice »
 *   hors hub seul  → « en main propre »
 *
 * ⚠️ « au » ET PAS « à » : les noms composés par la base commencent tous par
 * « Hub », un masculin. Une adresse commence par un numéro, qui se dit aussi
 * « au ». Le seul cas où « au » ne marcherait pas est celui où l'on ne nomme
 * précisément aucun lieu — et c'est celui qu'on écarte au-dessus.
 */
export function auLieu(lieu: LieuRendezVous): string {
  if (enMainPropre(lieu)) return 'en main propre';
  return `au ${lieu.name}`;
}
