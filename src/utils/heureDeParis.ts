// LA DATE ET L'HEURE D'UN TRAJET, EN HEURE DE PARIS.
//
// 🔴 UN TRAJET UNIQUE ÉTAIT DATÉ EN SILENCE, ET À L'HEURE DU TÉLÉPHONE (vu le
// 10/09/2026). L'assistant ne demandait qu'une heure ; le magasin la posait sur
// « aujourd'hui, ou demain si l'heure est passée » avec `new Date().setHours()`
// — le fuseau DU TÉLÉPHONE. Or le serveur lit les heures des arrêts en heure de
// Paris (`at time zone 'Europe/Paris'`). Un téléphone réglé ailleurs — ou un
// émulateur resté sur Londres, comme le nôtre — publiait un départ décalé d'une
// heure par rapport à ses propres arrêts. Et personne ne choisissait le JOUR.
//
// ⚠️ SANS `Intl` : le fuseau se calcule ici, à la main, sur la règle européenne
// — heure d'été du dernier dimanche de mars, 01:00 UTC, au dernier dimanche
// d'octobre, 01:00 UTC. Elle est fixée par la directive 2000/84/CE et ne dépend
// d'aucune base de fuseaux embarquée : c'est ce qui la rend testable sous
// `node --test`, et sûre sous Hermes.

const MINUTE = 60_000;
const JOUR = 86_400_000;

/** Le dernier dimanche du mois (0-11), à 01:00 UTC. */
function dernierDimanche01hUtc(annee: number, mois: number): number {
  const finDuMois = Date.UTC(annee, mois + 1, 0); // dernier jour, 00:00 UTC
  const jourSemaine = new Date(finDuMois).getUTCDay(); // 0 = dimanche
  return finDuMois - jourSemaine * JOUR + 60 * MINUTE;
}

/** Le décalage de Paris sur UTC, en minutes, à cet instant : 60 ou 120. */
export function decalageParisMinutes(instantMs: number): number {
  const annee = new Date(instantMs).getUTCFullYear();
  const ete = dernierDimanche01hUtc(annee, 2);
  const hiver = dernierDimanche01hUtc(annee, 9);
  return instantMs >= ete && instantMs < hiver ? 120 : 60;
}

/** « AAAA-MM-JJ » et « HH:MM » à Paris → l'instant, en ISO UTC. */
export function instantParis(date: string, heure: string): string {
  const [a, mo, j] = date.split('-').map(Number);
  const [h, mi] = heure.split(':').map(Number);
  const naif = Date.UTC(a, mo - 1, j, h, mi);
  // L'heure locale précède l'instant UTC du décalage — qu'on ne connaît qu'une
  // fois l'instant connu. Deux passes suffisent : le décalage ne change que deux
  // nuits par an, et d'une heure.
  let instant = naif - decalageParisMinutes(naif - 60 * MINUTE) * MINUTE;
  instant = naif - decalageParisMinutes(instant) * MINUTE;
  return new Date(instant).toISOString();
}

/** La date du calendrier parisien à cet instant, « AAAA-MM-JJ ». */
export function dateParis(instantMs: number): string {
  return new Date(instantMs + decalageParisMinutes(instantMs) * MINUTE).toISOString().slice(0, 10);
}

/** Cette date+heure parisienne est-elle déjà passée ? */
export function estPasse(date: string, heure: string, maintenantMs: number): boolean {
  return new Date(instantParis(date, heure)).getTime() <= maintenantMs;
}

const JOURS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

/** « ven. 12 sept. » — pour une date « AAAA-MM-JJ ». */
export function libelleDate(date: string): string {
  const [a, mo, j] = date.split('-').map(Number);
  const d = new Date(Date.UTC(a, mo - 1, j));
  return `${JOURS[d.getUTCDay()]} ${j} ${MOIS[mo - 1]}`;
}

/**
 * Les `n` prochains jours du calendrier parisien, à partir d'aujourd'hui :
 * « Aujourd'hui », « Demain », puis « sam. 13 sept. »…
 */
export function joursAVenir(maintenantMs: number, n: number): { date: string; libelle: string }[] {
  const aujourdhui = dateParis(maintenantMs);
  const [a, mo, j] = aujourdhui.split('-').map(Number);
  return Array.from({ length: n }, (_, i) => {
    const date = new Date(Date.UTC(a, mo - 1, j + i)).toISOString().slice(0, 10);
    const libelle = i === 0 ? "Aujourd'hui" : i === 1 ? 'Demain' : libelleDate(date);
    return { date, libelle };
  });
}

/**
 * La prochaine occurrence de « HH:MM » à Paris — aujourd'hui, ou demain si elle
 * est passée. Le repli quand aucune date n'a été choisie.
 */
export function prochainPassageParis(heure: string, maintenantMs: number): string {
  const aujourdhui = dateParis(maintenantMs);
  if (!estPasse(aujourdhui, heure, maintenantMs)) return instantParis(aujourdhui, heure);
  return instantParis(joursAVenir(maintenantMs, 2)[1].date, heure);
}
