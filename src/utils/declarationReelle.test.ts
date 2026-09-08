// UNE DÉCLARATION D'INCIDENT PART VRAIMENT, OU NE PART PAS DU TOUT.
//
// 🔴 CE QUE `useIncidentsStore` FAISAIT JUSQU'AU 07/09/2026. `submitIncident`
// attendait 800 ms (`MOCK_SUBMIT_DELAY`), fabriquait `incident-${Date.now()}`,
// rangeait l'objet en mémoire — et l'écran affichait « Formulaire envoyé. »
// Douze formulaires (absences, blocages, refus de colis, annulations,
// contestations) ne quittaient jamais le téléphone.
//
// 🔴 C'EST LA MÊME PANNE QUE `submitHubReport` ET `submitUserReport`, supprimées
// la veille : une fausse soumission qui rend un identifiant fabriqué après une
// attente cosmétique. Elle est PIRE ici, parce que ces dossiers décident de qui
// paie — `buyer_absent` fait payer le vendeur et le cotransporteur, et impute
// les frais à l'acheteur.
//
// 🔴 ET DEUX DOSSIERS DE DÉMONSTRATION ÉTAIENT SEMÉS AU DÉMARRAGE, sur des
// missions `mission-a1` / `mission-a2` inexistantes. Ils servaient au calcul
// des fenêtres de contestation : l'écran mesurait des délais réels contre des
// dossiers imaginaires.
//
// ⚠️ ON LIT LE CODE SANS SES COMMENTAIRES — ce fichier-ci, et les en-têtes du
// magasin et du service, CITENT tout ce qu'ils interdisent.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { lireCode } from '@/utils/sansCommentaires';

const MAGASIN = join(process.cwd(), 'src', 'stores', 'useIncidentsStore.ts');
const SERVICE = join(process.cwd(), 'src', 'services', 'incidents.ts');
const ECRAN = join(process.cwd(), 'src', 'app', 'incident', '[type].tsx');

test('🔴 LE MAGASIN N’ATTEND PLUS, ET NE FABRIQUE PLUS D’IDENTIFIANT', () => {
  const code = lireCode(MAGASIN);
  const fautes: string[] = [];
  if (/setTimeout\s*\(/.test(code)) fautes.push('une attente cosmétique est revenue');
  if (/MOCK_SUBMIT_DELAY/.test(code)) fautes.push('MOCK_SUBMIT_DELAY est revenu');
  if (/incident-\$\{|`incident-/.test(code)) fautes.push('un identifiant est fabriqué localement');
  if (/seed/i.test(code)) fautes.push('des dossiers de démonstration sont semés');
  assert.deepEqual(
    fautes,
    [],
    'le magasin refabrique des déclarations : un dossier qui décide de qui paie '
    + `ne peut pas naître dans le téléphone.\n  ${fautes.join('\n  ')}`,
  );
});

test('🔴 LE MAGASIN PASSE PAR LE SERVICE, ET LE SERVICE PAR LA FONCTION', () => {
  // Ni l'un ni l'autre ne doit écrire dans la table : l'insertion directe a été
  // fermée côté serveur le 07/09/2026, et c'est ce qui empêche un client de
  // poser lui-même `rendezvous_at`.
  const magasin = lireCode(MAGASIN);
  assert.match(magasin, /from '@\/services\/incidents'/, 'le magasin n’appelle plus le service');

  const service = lireCode(SERVICE);
  assert.match(service, /rpc\('declarer_incident'/, '`declarer_incident` n’est plus appelée');
  assert.ok(
    !/\.from\(\s*'incident_declarations'\s*\)\s*\n?\s*\.insert/.test(service),
    'le service insère directement dans `incident_declarations` : la fonction '
    + 'existe précisément pour que ce chemin n’existe pas',
  );
});

test('🔴 LE RÔLE, LE RENDEZ-VOUS ET LA FENÊTRE NE SONT PAS ENVOYÉS', () => {
  // ⚠️ CE QUI N'EST PAS TRANSMIS NE PEUT PAS ÊTRE MENTI. `declarer_incident`
  // déduit tout cela de la mission ; le jour où un paramètre les rouvrirait,
  // `app.tg_incident_admissibility` redeviendrait une porte dont le client
  // tient la clé.
  const code = lireCode(SERVICE);
  const interdits = ['p_rendezvous_at', 'p_declarant_role', 'p_declarant_id',
    'p_contestation_deadline', 'p_hub_id', 'p_mission_status'];
  const trouves = interdits.filter((p) => code.includes(p));
  assert.deepEqual(
    trouves,
    [],
    `paramètre(s) que le serveur doit déduire, et non recevoir : ${trouves.join(', ')}`,
  );
});

test('🔴 LES PHOTOS PARTENT AVANT LA DÉCLARATION — pas des URI locales', () => {
  // `proof_uris` recevait `file:///data/user/0/…`, valable sur ce téléphone et
  // nulle part ailleurs. C'est le défaut connu de `hub_reports.proofs`.
  const ecran = lireCode(ECRAN);
  assert.match(ecran, /televerserPreuves\(/, 'les preuves ne sont plus téléversées');
  assert.ok(
    !/proofUris:\s*Object\.values\(fieldPhotos\)/.test(ecran),
    'les URI locales repartent comme preuves',
  );
});

test('⚠️ ET L’ÉCRAN N’AFFIRME PLUS L’ENVOI QUAND LE SERVEUR A REFUSÉ', () => {
  // Le refus du serveur est une RÈGLE (« tolerance non ecoulee »), pas une
  // panne : l'écran doit s'arrêter là, pas dire « Formulaire envoyé. »
  const brut = readFileSync(ECRAN, 'utf8');
  const apresDeclarer = brut.slice(brut.indexOf('await declarer({'));
  const catchAvantSucces = apresDeclarer.indexOf('catch');
  // ⚠️ ON CHERCHE LE TEXTE, PAS LA FORME DE L'APPEL. La première version visait
  // `setToast('Formulaire envoyé.')` littéralement ; le jour où le bandeau a
  // gagné sa nature (`{ texte, type }`), la garde a cessé de trouver sa cible
  // et a échoué — pour un changement qui la satisfaisait pourtant. Une garde
  // doit tenir au sens, pas à la ponctuation.
  const toastSucces = apresDeclarer.indexOf("'Formulaire envoyé.'");
  assert.ok(toastSucces > -1, 'le message de succès a disparu de l’écran');
  assert.ok(catchAvantSucces > -1, 'l’envoi n’est plus protégé par un catch');
  assert.ok(
    catchAvantSucces < toastSucces,
    'le message de succès précède la gestion de l’échec',
  );
  assert.match(
    apresDeclarer.slice(catchAvantSucces, toastSucces),
    /return;/,
    'après un refus, l’écran continue et annonce quand même l’envoi',
  );
});
