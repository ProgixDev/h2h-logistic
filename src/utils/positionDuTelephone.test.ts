// « JE SUIS AU HUB » NE DOIT PLUS DÉPENDRE DU PREMIER RELEVÉ DE L'ÉCRAN.
//
// 🔴 CE QUE L'ÉMULATEUR A MONTRÉ LE 10/09/2026 : la position envoyée par le
// téléphone venait fixement devant le hub, et chaque appui répondait « Position
// indisponible : activez la localisation ». Le hook avait lu le GPS une seule
// fois, à l'ouverture — avant que la position existe — et plus jamais.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  AGE_MAX_MS,
  CLE_MESSAGE_GPS,
  FRAICHEUR_MAX_MS,
  avecDelai,
  estFrais,
  motifSansPosition,
  releveADeclarer,
  type Releve,
} from './positionDuTelephone';
import { lireCode } from './sansCommentaires';
import { fr } from '@/i18n/fr';
import { en } from '@/i18n/en';

const T0 = 1_757_500_000_000;
const releve = (ageMs: number, precisionM: number | null = 10): Releve => ({
  latitude: 43.3,
  longitude: 5.38,
  precisionM,
  mesureLe: T0 - ageMs,
});

test('🔴 UN RELEVÉ SUIVI RÉCENT PART TEL QUEL — pas d’attente au moment d’appuyer', () => {
  assert.equal(estFrais(releve(5_000), T0), true);
  assert.equal(estFrais(releve(FRAICHEUR_MAX_MS), T0), true);
  assert.equal(estFrais(releve(FRAICHEUR_MAX_MS + 1), T0), false, 'un relevé périmé part comme preuve');
  assert.equal(estFrais(null, T0), false);
});

test('🔴 LE PLUS RÉCENT GAGNE, MÊME MOINS PRÉCIS — c’est l’arrivée qu’on déclare', () => {
  const ancienPrecis = releve(50_000, 4);
  const recentFlou = releve(2_000, 35);
  assert.equal(releveADeclarer([ancienPrecis, recentFlou], T0), recentFlou);
  assert.equal(releveADeclarer([recentFlou, ancienPrecis], T0), recentFlou, 'l’ordre des candidats décide');
});

test('🔴 AU-DELÀ D’UNE MINUTE, AUCUN RELEVÉ NE DÉCRIT PLUS OÙ L’ON EST', () => {
  assert.equal(releveADeclarer([releve(AGE_MAX_MS + 1)], T0), null,
    'la position d’il y a deux minutes part comme celle de l’arrivée');
  assert.ok(releveADeclarer([releve(AGE_MAX_MS)], T0));
  assert.equal(releveADeclarer([null, null], T0), null);
});

test('⚠️ UN RELEVÉ HORODATÉ DANS LE FUTUR RESTE UTILISABLE — horloge décalée', () => {
  const futur = releve(-3_000);
  assert.equal(releveADeclarer([futur], T0), futur);
});

test('🔴 TROIS CAUSES, TROIS PHRASES — et la permission se juge d’abord', () => {
  assert.equal(motifSansPosition({ permission: false, servicesActifs: true }), 'permission');
  // Sans permission, on ne sait rien des services : la cause reste la permission.
  assert.equal(motifSansPosition({ permission: false, servicesActifs: false }), 'permission');
  assert.equal(motifSansPosition({ permission: true, servicesActifs: false }), 'services');
  assert.equal(motifSansPosition({ permission: true, servicesActifs: true }), 'recherche');
  const cles = Object.values(CLE_MESSAGE_GPS);
  assert.equal(new Set(cles).size, 3, 'deux causes partagent la même phrase');
});

test('🔴 CHAQUE CAUSE A SA PHRASE, EN FRANÇAIS ET EN ANGLAIS', () => {
  // ⚠️ `t()` REND LE CHEMIN DE LA CLÉ quand elle manque : l’écran afficherait
  // « presence.gpsNoFix » à quelqu’un qui cherche son hub.
  for (const cle of Object.values(CLE_MESSAGE_GPS)) {
    const [section, nom] = cle.split('.');
    for (const [langue, dico] of [['fr', fr], ['en', en]] as const) {
      const v = (dico as unknown as Record<string, Record<string, unknown>>)[section]?.[nom];
      assert.equal(typeof v, 'string', `${langue} : ${cle} manque`);
      assert.ok((v as string).length > 20, `${langue} : ${cle} ne dit pas quoi faire`);
    }
  }
  // Et la phrase fausse d’avant ne sert plus à la permission.
  assert.doesNotMatch(fr.presence.gpsPermission, /^Position indisponible/);
});

test('⚠️ UN RELEVÉ QUI NE VIENT PAS N’IMMOBILISE PAS LE BOUTON', async () => {
  const jamais = new Promise<number>(() => {});
  assert.equal(await avecDelai(jamais, 20), null);
  assert.equal(await avecDelai(Promise.resolve(7), 1_000), 7);
  assert.equal(await avecDelai(Promise.reject(new Error('gps')), 1_000), null, 'un échec remonte en exception');
});

test('🔴 LE HOOK SUIT LA POSITION, ET RELIT AU MOMENT D’APPUYER', () => {
  // ⚠️ TEST DE STRUCTURE : la règle est juste ci-dessus, mais le défaut était
  // que le hook ne relisait jamais. Il faut le voir s’abonner.
  const hook = lireCode(join(process.cwd(), 'src', 'hooks', 'useHubPresence.ts'));
  assert.match(hook, /Location\.watchPositionAsync\(/, 'plus de suivi continu de la position');
  assert.match(hook, /\.remove\(\)/, 'l’abonnement GPS n’est jamais levé — la batterie paie');
  assert.match(hook, /avecDelai\(\s*Location\.getCurrentPositionAsync\(/, 'la relecture à l’appui n’a plus de borne');
  assert.match(hook, /releveADeclarer\(/);
  assert.match(hook, /motifSansPosition\(/);
  assert.match(hook, /AppState\.addEventListener\('change'/,
    'revenir des réglages ne relance plus le suivi');
});

test('🔴 UN SEUL LECTEUR GPS PAR ÉCRAN, ET LA PRÉCISION PART AVEC LA POSITION', () => {
  // La carte lisait sa propre position à côté de celle de l’écran : deux
  // relevés, deux vérités, et c’était celle de l’écran — la plus vieille — qui
  // partait au serveur.
  const carte = lireCode(join(process.cwd(), 'src', 'components', 'logistics', 'HubPresenceCard.tsx'));
  assert.doesNotMatch(carte, /useHubPresence\(/, 'la carte relit le GPS de son côté');
  for (const ecran of ['pickup', 'delivery']) {
    const code = lireCode(join(process.cwd(), 'src', 'app', 'mission', `${ecran}.tsx`));
    assert.match(code, /positionPourDeclarer\(\)/, `${ecran} envoie une position lue à l’ouverture`);
    assert.match(code, /precisionM:\s*[\w.]+\.precisionM/, `${ecran} n’envoie plus la précision du relevé`);
    // 🔴 HORS ZONE, LA PAGE RESTE : le passage au scan n'arrive que sur un
    // verdict DANS la zone, ou sur « continuer sans présence validée ».
    assert.match(code, /setHorsZone\(\{\s*distanceM:\s*r\.distanceM/, `${ecran} ne garde plus le verdict hors zone`);
    assert.match(code, /onContinuer=\{/, `${ecran} n’offre plus de continuer sans présence validée`);
  }
});

test('🔴 PLUS DE « VOUS ÊTES À PROXIMITÉ ! » ÉCRIT À LA MAIN', () => {
  // `delivery.tsx` affichait une distance tirée de `useState(180)` — jamais
  // mesurée, identique pour tout le monde, où qu'il soit.
  const code = lireCode(join(process.cwd(), 'src', 'app', 'mission', 'delivery.tsx'));
  assert.doesNotMatch(code, /useState\(\s*\d+\s*\)[^\n]*\n?[^\n]*proximit/i);
  assert.doesNotMatch(code, /à proximité/, 'une proximité non mesurée est revenue');
});

test('⚠️ AUCUN `expo-location` ICI — sinon ces règles ne se testent plus', () => {
  const src = readFileSync(join(process.cwd(), 'src', 'utils', 'positionDuTelephone.ts'), 'utf8');
  assert.doesNotMatch(lireCode(join(process.cwd(), 'src', 'utils', 'positionDuTelephone.ts')), /from\s+'expo-location'/);
  assert.ok(src.length > 0);
});
