// LE PROTOCOLE D'INCIDENTS APPARTIENT À LA BASE — L'APPLICATION LE RECOPIE.
//
// 🔴 DEUX VÉRITÉS POUR UNE MÊME RÈGLE, ET AUCUNE NE SAVAIT QUE L'AUTRE
// EXISTAIT. `ref.delay_protocol` porte UNE ligne, versionnée par
// `effective_from` : tolérance, fenêtre de contestation, délai d'annulation
// sans frais, frais d'annulation tardive, frais d'absence vendeur et son
// partage. `src/constants/delaysRules.ts` redisait les huit, en euros au lieu
// de centimes. `ref.incident_forms` porte quatorze lignes avec leurs
// déclarants, leur règle de délai et leur libellé ; `constants/
// formulairesIncident.ts` en redisait une partie sous d'autres noms.
//
// 🔴 ET LA BASE, ELLE, S'EN SERT POUR REFUSER. `app.tg_incident_admissibility`
// lit `ref.delay_protocol` et `ref.incident_forms.requires_tolerance_elapsed`
// à chaque insertion dans `public.incident_declarations` : une déclaration
// déposée trop tôt est REJETÉE, et c'est le serveur qui calcule
// `contestation_deadline`. La copie de l'application n'est donc pas un
// doublon inoffensif : le jour où un tarif change en base, l'écran continue
// d'annoncer l'ancien pendant que le serveur applique le nouveau.
//
// ⚠️ POURQUOI RECOPIER PLUTÔT QUE LIRE. `ref` n'est PAS lisible par
// `authenticated` — `has_table_privilege('authenticated','ref.delay_protocol',
// 'select')` est faux, et il n'y a aucune politique RLS dans ce schéma. Lire ces
// valeurs à l'exécution demanderait une migration dans l'autre dépôt. La copie
// reste donc, mais TENUE : ce test échoue dès qu'elle diverge.
//
// ⚠️ CE TEST ÉCHOUE QUAND LE DÉPÔT VOISIN EST ABSENT — IL NE S'IGNORE PAS.
// Même raison que `aucuneRpcInexistante.test.ts` : un contrôle vert qui n'a
// rien vérifié est le défaut que cette famille de gardes existe pour empêcher.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';
import { ABSENCE, ouvrirSchemaVoisin, schemaVoisinPresent } from '@/backend/schemaVoisin';
import { lireCode } from '@/utils/sansCommentaires';
import { DELAYS, TOLERANCE_PROTOCOLE_MINUTES } from '@/constants/delaysRules';
import { INCIDENT_FORM_SPECS, roleFromAnswer } from '@/constants/formulairesIncident';

const RACINE = join(process.cwd(), 'src');

type LigneProtocole = {
  tolerance_minutes: number;
  contestation_hours: number;
  free_cancel_hours_before: number;
  double_absence_claim_minutes: number;
  late_cancel_fee_cents: number;
  seller_absent_fee_cents: number;
  seller_absent_transporter_cents: number;
  seller_absent_platform_cents: number;
};

type LigneFormulaire = {
  type: string;
  label_fr: string;
  declarants: string[] | string;
  requires_tolerance_elapsed: boolean;
  opens_contestation: boolean;
  delay_rule_id: string | null;
};

let protocole: LigneProtocole | null = null;
const formulaires = new Map<string, LigneFormulaire>();

if (schemaVoisinPresent()) {
  const db = await ouvrirSchemaVoisin();

  // La ligne EN VIGUEUR, pas n'importe laquelle : `effective_from` versionne la
  // table, et c'est exactement ce que fait `app.tg_incident_admissibility`.
  protocole = ((await db.query(
    'select * from ref.delay_protocol order by effective_from desc limit 1',
  )).rows[0] ?? null) as LigneProtocole | null;

  for (const l of (await db.query('select * from ref.incident_forms')).rows as LigneFormulaire[]) {
    formulaires.set(l.type, l);
  }
  await db.close();
}

/** `declarants` revient en `text[]` ou en littéral `{a,b}` selon le pilote. */
const declarants = (l: LigneFormulaire): string[] =>
  Array.isArray(l.declarants)
    ? l.declarants
    : String(l.declarants).replace(/^\{|\}$/g, '').split(',').filter(Boolean);

test('🔴 CHAQUE VALEUR DE `DELAYS` EST CELLE DE `ref.delay_protocol`', () => {
  assert.ok(schemaVoisinPresent(), ABSENCE);
  assert.ok(protocole, 'ref.delay_protocol est vide — le protocole n’a plus de valeurs en vigueur');

  // ⚠️ LA BASE COMPTE EN CENTIMES, L'ÉCRAN EN EUROS. La conversion est ici,
  // explicite : c'est le seul endroit où les deux unités se rencontrent, et
  // c'est aussi là qu'un facteur cent se glisse sans qu'on le voie.
  const attendu: Record<string, number> = {
    contestationHours: protocole.contestation_hours,
    freeCancelHoursBefore: protocole.free_cancel_hours_before,
    doubleAbsenceClaimMinutes: protocole.double_absence_claim_minutes,
    lateCancelFeeEur: protocole.late_cancel_fee_cents / 100,
    sellerAbsentFeeEur: protocole.seller_absent_fee_cents / 100,
  };

  const ecarts: string[] = [];
  for (const [cle, valeur] of Object.entries(attendu)) {
    const dans = (DELAYS as unknown as Record<string, number>)[cle];
    if (dans !== valeur) ecarts.push(`DELAYS.${cle} = ${dans}, la base dit ${valeur}`);
  }
  if (DELAYS.sellerAbsentSplit.transporter !== protocole.seller_absent_transporter_cents / 100) {
    ecarts.push(
      `DELAYS.sellerAbsentSplit.transporter = ${DELAYS.sellerAbsentSplit.transporter}, `
      + `la base dit ${protocole.seller_absent_transporter_cents / 100}`,
    );
  }
  if (DELAYS.sellerAbsentSplit.platform !== protocole.seller_absent_platform_cents / 100) {
    ecarts.push(
      `DELAYS.sellerAbsentSplit.platform = ${DELAYS.sellerAbsentSplit.platform}, `
      + `la base dit ${protocole.seller_absent_platform_cents / 100}`,
    );
  }

  assert.deepEqual(
    ecarts,
    [],
    `${ecarts.length} valeur(s) qui ne disent plus la même chose que la base :\n  `
    + `${ecarts.join('\n  ')}\n\n`
    + 'La base décide — `app.tg_incident_admissibility` l’applique pour refuser '
    + 'une déclaration. L’écran qui annonce autre chose ment à l’utilisateur.',
  );
});

test('⚠️ ET LE PARTAGE DE L’ABSENCE VENDEUR FAIT BIEN LE TOTAL', () => {
  assert.ok(protocole, ABSENCE);
  // Une répartition qui ne somme pas au total est de l'argent qui apparaît ou
  // disparaît. La base le garantit déjà pour elle-même ; on garantit la copie.
  assert.equal(
    DELAYS.sellerAbsentSplit.transporter + DELAYS.sellerAbsentSplit.platform,
    DELAYS.sellerAbsentFeeEur,
  );
  assert.equal(
    protocole.seller_absent_transporter_cents + protocole.seller_absent_platform_cents,
    protocole.seller_absent_fee_cents,
  );
});

test('🔴 LA TOLÉRANCE GÉNÉRALE EST CELLE DE LA BASE, ELLE AUSSI', () => {
  assert.ok(schemaVoisinPresent(), ABSENCE);
  assert.ok(protocole, 'ref.delay_protocol est vide');
  assert.equal(
    TOLERANCE_PROTOCOLE_MINUTES,
    protocole.tolerance_minutes,
    'la tolérance du protocole s’est écartée de `ref.delay_protocol` — c’est '
    + 'elle que `app.tg_incident_admissibility` applique pour refuser une '
    + 'déclaration déposée trop tôt',
  );
});

test('🔴 `DELAYS` NE PORTE PLUS DE TOLÉRANCE — elle est PAR MISSION', () => {
  // 🔴 CE QUI A ÉTÉ RETIRÉ LE 07/09/2026. `DELAYS.toleranceMinutes` valait 10
  // pour tout le monde, et la fenêtre de refus du colis (F11) s'y fiait, alors
  // que `missions.tolerance_minutes` est une COLONNE.
  //
  // ⚠️ IL EXISTE BIEN UNE TOLÉRANCE GLOBALE EN BASE
  // (`ref.delay_protocol.tolerance_minutes`), mais elle sert au SERVEUR pour la
  // recevabilité d'une déclaration, pas à l'écran pour dessiner un créneau. Les
  // confondre, c'est réintroduire le défaut par la porte d'à côté.
  assert.ok(
    !('toleranceMinutes' in DELAYS),
    'la tolérance est revenue dans DELAYS : elle vient de `missions.tolerance_minutes`, '
    + 'pas d’une constante globale',
  );
});

test('🔴 LES QUATORZE FORMULAIRES SONT LES MÊMES DES DEUX CÔTÉS', () => {
  assert.ok(schemaVoisinPresent(), ABSENCE);
  assert.ok(formulaires.size > 0, 'ref.incident_forms est vide');

  // ⚠️ `common` N'A PAS DE SPEC, ET C'EST VOULU : c'est le bloc partagé que
  // `CommonFormFields` rend sous chaque formulaire, pas un formulaire à part.
  const enBase: string[] = [...formulaires.keys()].filter((t) => t !== 'common').sort();
  const dansLApp: string[] = INCIDENT_FORM_SPECS.map((s) => String(s.type)).sort();

  assert.deepEqual(
    dansLApp.filter((t) => !enBase.includes(t)),
    [],
    'formulaire(s) que l’application propose et que `ref.incident_forms` ignore — '
    + 'une déclaration de ce type serait refusée par la clé étrangère de '
    + '`incident_declarations.type`',
  );
  assert.deepEqual(
    enBase.filter((t) => !dansLApp.includes(t)),
    [],
    'formulaire(s) prévu(s) en base que l’application n’ouvre nulle part',
  );
});

test('🔴 LE DÉCLARANT PAR DÉFAUT EST UN DÉCLARANT PERMIS', () => {
  assert.ok(schemaVoisinPresent(), ABSENCE);

  const fautifs: string[] = [];
  for (const spec of INCIDENT_FORM_SPECS) {
    const ligne = formulaires.get(spec.type);
    if (!ligne) continue; // déjà signalé par le test précédent
    const permis = declarants(ligne);
    if (!permis.includes(spec.role)) {
      fautifs.push(`${spec.type} : l’app déclare « ${spec.role} », la base permet ${permis.join(', ')}`);
    }
  }
  assert.deepEqual(fautifs, [], `rôle(s) de déclarant hors de ce que la base permet :\n  ${fautifs.join('\n  ')}`);
});

test('⚠️ ET LES RÔLES PROPOSÉS AU CHOIX LE SONT AUSSI', () => {
  assert.ok(schemaVoisinPresent(), ABSENCE);

  // F6 et F13 demandent son rôle au déclarant. Proposer « Vendeur » là où la
  // base ne l'accepte pas ferait remplir un formulaire pour rien.
  //
  // ⚠️ ON VÉRIFIE L'INCLUSION, PAS L'ÉGALITÉ. `hub_blocked` permet les trois
  // déclarants en base alors que l'écran n'offre qu'acheteur et cotransporteur :
  // c'est le hub de REMISE, le vendeur n'y est pas. La base est plus large que
  // l'écran, jamais l'inverse.
  const fautifs: string[] = [];
  for (const spec of INCIDENT_FORM_SPECS) {
    if (!spec.roleFieldId) continue;
    const ligne = formulaires.get(spec.type);
    if (!ligne) continue;
    const permis = declarants(ligne);
    const champ = spec.fields.find((f) => f.id === spec.roleFieldId);
    assert.ok(champ, `${spec.type} : roleFieldId « ${spec.roleFieldId} » ne désigne aucun champ`);
    for (const option of champ.options ?? []) {
      const role = roleFromAnswer(option);
      if (!role) fautifs.push(`${spec.type} : « ${option} » ne correspond à aucun rôle`);
      else if (!permis.includes(role)) {
        fautifs.push(`${spec.type} : « ${option} » → ${role}, que la base ne permet pas (${permis.join(', ')})`);
      }
    }
  }
  assert.deepEqual(fautifs, [], `choix de rôle impossible(s) :\n  ${fautifs.join('\n  ')}`);
});

test('🔴 CHAQUE FORMULAIRE RÉFÉRENCE LA RÈGLE DE DÉLAI QUE LA BASE LUI DONNE', () => {
  assert.ok(schemaVoisinPresent(), ABSENCE);

  const fautifs: string[] = [];
  for (const spec of INCIDENT_FORM_SPECS) {
    const ligne = formulaires.get(spec.type);
    if (!ligne) continue;
    const enBase = ligne.delay_rule_id ?? undefined;
    if (spec.delayRuleId !== enBase) {
      fautifs.push(`${spec.type} : l’app dit ${spec.delayRuleId ?? '(aucune)'}, la base dit ${enBase ?? '(aucune)'}`);
    }
  }
  assert.deepEqual(
    fautifs,
    [],
    `règle(s) de délai divergente(s) :\n  ${fautifs.join('\n  ')}\n\n`
    + 'L’écran renvoie l’utilisateur vers « Règles de délais » : le pointer vers '
    + 'la mauvaise règle, c’est lui expliquer une décision qui n’est pas la sienne.',
  );
});

// ── LA TOLÉRANCE NE S'ÉCRIT PLUS À LA MAIN ─────────────────────────────────

const fichiers = (dir: string, acc: string[] = []): string[] => {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) fichiers(p, acc);
    else if (/\.tsx?$/.test(e)) acc.push(p);
  }
  return acc;
};

test('🔴 AUCUNE CONSTANTE DE TOLÉRANCE N’EST ÉCRITE EN DUR', () => {
  // ⚠️ ON CHERCHE LA DÉCLARATION, PAS LE MOT. Les écrans ont le droit de PARLER
  // de tolérance, et `toleranceMinutes` reçu en PARAMÈTRE est exactement ce
  // qu'on veut. Ce qu'on refuse, c'est une valeur décidée dans l'application.
  //
  // 🔴 ET ON LIT LE CODE SANS SES COMMENTAIRES. Cette garde a exactement les
  // mots qu'elle interdit dans ses propres notes ; sans `lireCode`, elle
  // tomberait sur la phrase qui prouve qu'elle est satisfaite. Même piège que
  // `pickupFlow.test.ts` décrit depuis le début.
  // ⚠️ `={10}` COMPTE AUTANT QUE `= 10`. La première version de cette garde ne
  // voyait que la valeur par défaut ; `DailyConfirmation` passait
  // `toleranceMinutes={10}` en JSX, et passait donc entre les mailles.
  const fautifs: string[] = [];
  for (const chemin of fichiers(RACINE)) {
    if (chemin.endsWith('protocoleAppartientALaBase.test.ts')) continue;
    for (const [i, ligne] of lireCode(chemin).split('\n').entries()) {
      if (/\b(const|let|var)\s+(DEFAULT_)?TOLERANCE_MINUTES\b/.test(ligne)
        || /\btoleranceMinutes\s*=\s*\{?\s*\d+/.test(ligne)) {
        fautifs.push(`${chemin.replace(process.cwd(), '.')}:${i + 1} : ${ligne.trim()}`);
      }
    }
  }
  assert.deepEqual(
    fautifs,
    [],
    'la tolérance vient de `missions.tolerance_minutes`, pas d’un nombre écrit '
    + `dans l’application :\n  ${fautifs.join('\n  ')}`,
  );
});

test('🔴 ET LE CODE DE MISSION NE LIT JAMAIS LA TOLÉRANCE GÉNÉRALE', () => {
  // 🔴 LE SEUL USAGE LÉGITIME DE `TOLERANCE_PROTOCOLE_MINUTES` EST « AVANT LA
  // MISSION ». Ces trois dossiers ont toujours une mission sous la main : y
  // lire une valeur globale, c'est réintroduire par la porte d'à côté le
  // défaut qu'on vient de fermer — une mission à quinze minutes affichée à dix.
  const AVEC_MISSION = [
    join('src', 'app', 'mission'),
    join('src', 'components', 'mission'),
    join('src', 'components', 'logistics'),
  ];
  const fautifs: string[] = [];
  for (const chemin of fichiers(RACINE)) {
    const relatif = chemin.replace(process.cwd() + sep, '');
    if (!AVEC_MISSION.some((d) => relatif.startsWith(d))) continue;
    if (lireCode(chemin).includes('TOLERANCE_PROTOCOLE_MINUTES')) {
      fautifs.push(`./${relatif.replace(/\\/g, '/')}`);
    }
  }
  assert.deepEqual(
    fautifs,
    [],
    'fichier(s) de mission qui lisent la tolérance globale au lieu de celle de '
    + `la mission :\n  ${fautifs.join('\n  ')}`,
  );
});

test('🔴 AUCUN LIBELLÉ DE FORMULAIRE N’ANNONCE UNE TOLÉRANCE CHIFFRÉE', () => {
  // 🔴 LE DÉFAUT CORRIGÉ LE 07/09/2026. Trois questions demandaient « avez-vous
  // attendu la fin de la tolérance de 10 minutes ? » — à quelqu'un dont la
  // mission pouvait en porter quinze. La réponse partait ensuite au dossier
  // comme élément de preuve, sur une question qui n'était pas la sienne.
  const chiffree = /tol[ée]rance\s+de\s+\d+/i;
  const fautifs: string[] = [];
  for (const spec of INCIDENT_FORM_SPECS) {
    const textes: [string, string | undefined][] = [
      ['message', spec.message],
      ['preValidation', spec.preValidation],
      ['preValidation.moreThan1h', spec.preValidationVariants?.moreThan1h],
      ['preValidation.lessThan1h', spec.preValidationVariants?.lessThan1h],
      ...spec.fields.map((f) => [`champ ${f.id}`, f.label] as [string, string]),
    ];
    for (const [ou, texte] of textes) {
      if (texte && chiffree.test(texte)) fautifs.push(`${spec.type} / ${ou} : « ${texte.trim()} »`);
    }
  }
  assert.deepEqual(
    fautifs,
    [],
    `${fautifs.length} texte(s) qui chiffrent la tolérance au lieu de la lire :\n  `
    + `${fautifs.join('\n  ')}\n\n`
    + 'Le jeton `{tolerance}` est remplacé à l’écran par la tolérance de LA '
    + 'MISSION (voir `interpolerLibelle` dans `utils/tolerance.ts`).',
  );
});
