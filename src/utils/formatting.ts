import dayjs from 'dayjs';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

/**
 * Un montant COURT, pour les etiquettes ou la forme pleine ne tient pas —
 * une barre de neuf pixels dans un graphique, par exemple.
 *
 * ⚠️ CE N'EST PAS UN RACCOURCI TYPOGRAPHIQUE. Elle arrondit comme le
 * `toFixed(0)` qu'elle remplace (12,5 -> « 13 € »), donc l'etiquette dit la
 * meme chose qu'avant ; ce qu'elle ajoute est le SEPARATEUR DE MILLIERS et
 * l'espace insecable. Une semaine a 1 250 € s'affichait « 1250€ ».
 */
export function formatCurrencyCompact(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Un montant SANS symbole, pour les gabarits de traduction qui placent le
 * « € » eux-memes — et qui ne le placent pas au meme endroit : le francais
 * dit « {amount} € », l'anglais « €{amount} ». Leur passer une somme deja
 * formatee afficherait DEUX symboles en anglais.
 *
 * ⚠️ FRANÇAIS, COMME TOUT CE FICHIER. `formatCurrency` fixe deja « fr-FR »
 * alors que l'application sait basculer en anglais (`settings/index.tsx`
 * appelle `changeLanguage`) : un montant reste donc a la française sur un
 * ecran anglais. C'est une incoherence qui precede cette fonction et qui la
 * depasse — la corriger demande de rendre TOUT ce fichier sensible a la
 * langue, et de reprendre les vingt-cinq appels de `formatCurrency`.
 */
export function formatAmount(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string, format = 'DD/MM/YYYY'): string {
  return dayjs(date).format(format);
}

export function formatTime(date: string): string {
  return dayjs(date).format('HH:mm');
}

export function formatDateTime(date: string): string {
  return dayjs(date).format('DD/MM/YYYY HH:mm');
}

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('33') && cleaned.length === 11) {
    return `+33 ${cleaned.slice(2, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5, 7)} ${cleaned.slice(7, 9)} ${cleaned.slice(9, 11)}`;
  }
  return phone;
}

export function formatWeight(kg: number): string {
  if (kg < 1) return `${Math.round(kg * 1000)} g`;
  return `${kg} kg`;
}

/**
 * « Taille M — 2 kg », ou « Taille M » si le poids n'a pas été déclaré.
 *
 * 🔴 « 0 kg » S'AFFICHAIT SUR CHAQUE CO-LIVRAISON (vu le 10/09/2026) : le poids
 * n'est relevé nulle part, et `null` devenait `0`. Un poids inconnu ne s'écrit
 * pas — un zéro, lui, se croit.
 */
export function tailleEtPoids(taille: string, kg: number | null | undefined): string {
  return kg != null && kg > 0 ? `${taille} — ${formatWeight(kg)}` : taille;
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}
