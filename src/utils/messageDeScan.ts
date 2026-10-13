// CE QU'UN RÉSULTAT DE SCAN VEUT DIRE, EN CLAIR — sans rien décider.
//
// 🔴 LE VERDICT VIENT DU SERVEUR (`record_scan_event`). Ce module ne fait que
// choisir les mots ; il est à part de `services/scans.ts` pour se lire et
// s'essayer sans la base ni le téléphone.

/** Ce que la base répond à un scan. */
export type ResultatScan =
  | 'success'
  | 'package_mismatch'
  | 'wrong_code'
  | 'no_eligible'
  | 'expired_qr'
  | 'out_of_window'
  | 'duplicate';

/** Le genre de scan, tel que `handoff_kind` le nomme. */
export type GenreScan = 'seller_qr' | 'buyer_qr' | 'tracking_qr' | 'photo' | 'geo_presence' | 'system';

/** Ce qu'un résultat veut dire pour le cotransporteur particulier, en clair. */
export function messageDeScan(r: ResultatScan, genre: GenreScan): string {
  switch (r) {
    case 'success':
      return 'Vérifié ✓';
    case 'package_mismatch':
      return "Ce colis n'est pas celui de la co-livraison. Vérifiez l'étiquette.";
    case 'wrong_code':
      return genre === 'seller_qr'
        ? "Ce n'est pas le code du vendeur de cette co-livraison."
        : "Ce n'est pas le code de l'acheteur de cette co-livraison.";
    case 'no_eligible':
      // 🔴 DEUX CAS, ET ILS N'APPELLENT PAS LE MÊME GESTE. Sur le code d'une
      // personne, le refus dit que le colis n'en est pas à cette étape — un code
      // ne se valide qu'à la sienne (§ 5.4.2 des CGU H2H Logistic,
      // `20261013001000`). Sur l'étiquette du colis, il dit le plus souvent que
      // l'identité d'en face n'a pas encore été scannée.
      return genre === 'seller_qr' || genre === 'buyer_qr'
        ? "Ce code ne se valide pas à cette étape de la co-livraison."
        : "Cette étape n'est pas ouverte : identifiez d'abord la personne en face.";
    case 'expired_qr':
      return 'Ce code a expiré. Demandez-en un nouveau.';
    case 'out_of_window':
      // 🔴 UN CODE NE SE VALIDE PAS À L'AVANCE (§ 5.4.2) : avant l'ouverture du
      // créneau, le serveur refuse — bon code ou non. Un retard, lui, ne ferme
      // rien : ce refus ne vient jamais « après ».
      return "Le créneau de ce rendez-vous n'est pas encore ouvert : le code se scanne à partir de son ouverture.";
    case 'duplicate':
      return 'Ce scan a déjà été enregistré.';
  }
}
