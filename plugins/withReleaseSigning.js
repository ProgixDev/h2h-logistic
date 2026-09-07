const { withAppBuildGradle, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Config plugin: persiste la signature Android de RELEASE à travers
// `expo prebuild`. Le dossier `android/` est gitignoré et régénéré par prebuild,
// ce qui remettrait sinon la signature de release sur la clé de DÉBOGAGE.
//
// 🔴 07/09/2026 — IL MANQUAIT LA MOITIÉ DU MÉCANISME. Le plugin réinjectait bien
// une `signingConfig release` qui LIT `android/keystore.properties`, mais rien ne
// produisait ce fichier. Il n'existait sur aucun poste. Et comme le bloc est gardé
// par `if (keystoreProperties['storeFile'])`, son absence ne cassait rien :
// `assembleRelease` sortait un `.apk` NON SIGNÉ, sans un mot.
//
// ⚠️ UN FICHIER QUE PREBUILD EFFACE NE PEUT PAS ÊTRE ÉCRIT À LA MAIN. C'est
// pourquoi il est désormais GÉNÉRÉ ici, à chaque prebuild, depuis
// l'environnement. Le secret vit dans `.env.local` (gitignoré) ou dans les
// variables du CI ; il n'entre ni dans le dépôt ni dans le paquet.
//
// 🔴 ET SURTOUT PAS DE PRÉFIXE `EXPO_PUBLIC_`. Tout ce qui le porte est INJECTÉ
// DANS LE BUNDLE par Metro : le mot de passe du keystore de production partirait
// dans le `.apk` qu'il est censé protéger.
//
// 🔴 LES BLOCS INJECTÉS SONT DÉLIMITÉS PAR DES SENTINELLES, ET C'EST LE POINT LE
// PLUS FACILE À RATER. `expo prebuild` sans `--clean` RÉUTILISE le `android/`
// existant : le mod s'applique donc à un `build.gradle` qui porte DÉJÀ une
// injection. Les gardes d'origine se contentaient de vérifier « est-ce déjà là ? »
// et sautaient l'étape — ce qui rendait toute ÉVOLUTION du plugin invisible tant
// qu'on ne faisait pas un `--clean`. Vérifié : le garde-fou ajouté ce jour-là
// n'est jamais arrivé dans le fichier. On retire donc l'ancienne injection avant
// de poser la nouvelle.

/** Les quatre variables attendues, dans l'ordre du fichier produit. */
const VARIABLES = {
  storeFile: 'H2H_ANDROID_KEYSTORE_PATH',
  storePassword: 'H2H_ANDROID_KEYSTORE_PASSWORD',
  keyAlias: 'H2H_ANDROID_KEY_ALIAS',
  keyPassword: 'H2H_ANDROID_KEY_PASSWORD',
};

/**
 * ⚠️ FORMAT `.properties` JAVA, PAS `.env`. La barre oblique inverse y est un
 * ÉCHAPPEMENT : `C:\dev\h2h-keystores\h2h-release.keystore` écrit tel quel se
 * relit `C:devh2h-keystoresh2h-release.keystore`, et Gradle cherche un fichier
 * qui n'a jamais existé. On écrit donc le chemin en barres NORMALES — Java les
 * accepte sur Windows — et on échappe les barres inverses des autres valeurs.
 */
function valeurProperties(valeur, estChemin) {
  const v = estChemin ? String(valeur).replace(/\\/g, '/') : String(valeur);
  return v.replace(/\\/g, '\\\\');
}

/**
 * Le contenu de `keystore.properties`, ou `null` si l'environnement ne le
 * permet pas. Pur — exporté pour être testé sans lancer un prebuild.
 */
function proprietesDepuisEnv(env) {
  const manquantes = Object.values(VARIABLES).filter((nom) => !env[nom]);
  if (manquantes.length > 0) return { contenu: null, manquantes };

  const lignes = Object.entries(VARIABLES).map(
    ([cle, nom]) => `${cle}=${valeurProperties(env[nom], cle === 'storeFile')}`,
  );
  return { contenu: `${lignes.join('\n')}\n`, manquantes: [] };
}

// ── Les blocs injectés, et leurs sentinelles ───────────────────────────────

const SENT_LOADER_DEBUT = '// >>> withReleaseSigning : chargement du keystore — genere >>>';
const SENT_LOADER_FIN = '// <<< withReleaseSigning : fin du chargement <<<';
const SENT_SIGNING_DEBUT = '        // >>> withReleaseSigning : signingConfig release — genere >>>';
const SENT_SIGNING_FIN = '        // <<< withReleaseSigning : fin du signingConfig <<<';

/** L'injection des versions du plugin antérieures aux sentinelles. */
const LOADER_HISTORIQUE =
  'def keystorePropertiesFile = rootProject.file("keystore.properties")\n' +
  'def keystoreProperties = new Properties()\n' +
  'if (keystorePropertiesFile.exists()) {\n' +
  '    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))\n' +
  '}';

// ⚠️ SANS SAUT DE LIGNE FINAL — comme la forme à sentinelles, pour que les deux
// se retirent exactement de la même façon.
const SIGNING_HISTORIQUE =
  "        release {\n" +
  "            if (keystoreProperties['storeFile']) {\n" +
  "                storeFile file(keystoreProperties['storeFile'])\n" +
  "                storePassword keystoreProperties['storePassword']\n" +
  "                keyAlias keystoreProperties['keyAlias']\n" +
  "                keyPassword keystoreProperties['keyPassword']\n" +
  "            }\n" +
  "        }";

const BLOC_LOADER = [
  SENT_LOADER_DEBUT,
  'def keystorePropertiesFile = rootProject.file("keystore.properties")',
  'def keystoreProperties = new Properties()',
  'if (keystorePropertiesFile.exists()) {',
  '    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))',
  '}',
  '',
  '// UNE RELEASE NON SIGNEE NE DOIT PAS SORTIR EN SILENCE. Sans ce garde-fou,',
  '// `assembleRelease` reussissait et produisait un `.apk` ininstallable.',
  'gradle.taskGraph.whenReady { graph ->',
  "    if (!keystoreProperties['storeFile'] && graph.allTasks.any { it.path.toLowerCase().contains('release') }) {",
  '        throw new GradleException(',
  '            "Signature de release absente : android/keystore.properties est introuvable ou vide.\\n" +',
  '            "Renseignez H2H_ANDROID_KEYSTORE_PATH, H2H_ANDROID_KEYSTORE_PASSWORD, " +',
  '            "H2H_ANDROID_KEY_ALIAS et H2H_ANDROID_KEY_PASSWORD (voir .env.example), " +',
  '            "puis relancez npx expo prebuild -p android."',
  '        )',
  '    }',
  '}',
  SENT_LOADER_FIN,
].join('\n');

const BLOC_SIGNING = [
  SENT_SIGNING_DEBUT,
  '        release {',
  "            if (keystoreProperties['storeFile']) {",
  "                storeFile file(keystoreProperties['storeFile'])",
  "                storePassword keystoreProperties['storePassword']",
  "                keyAlias keystoreProperties['keyAlias']",
  "                keyPassword keystoreProperties['keyPassword']",
  '            }',
  '        }',
  SENT_SIGNING_FIN,
  '',
].join('\n');

/**
 * Retire une injection précédente : celle délimitée par les sentinelles, ou à
 * défaut celle des versions antérieures, reconnue à son texte exact.
 */
// ⚠️ LES DEUX BLOCS NE SE RETIRENT PAS DE LA MÊME FAÇON, et confondre les deux
// mange une accolade. Le chargeur est posé au niveau du script, précédé de deux
// sauts de ligne qu'il faut reprendre — sinon chaque passage en ajoute deux et
// l'idempotence est perdue. Le `signingConfig`, lui, est IMBRIQUÉ dans
// `signingConfigs { }` : remonter avant lui collerait `signingConfigs {` à la
// ligne suivante et l'ancre d'insertion ne retrouverait plus son saut de ligne.
// Lui, c'est le saut de ligne qui le SUIT qui lui appartient.
function retirerInjection(gradle, debut, fin, historique, { rognerAvant }) {
  const decoupe = (i, finIndex) => {
    let k = i;
    if (rognerAvant) while (k > 0 && gradle[k - 1] === '\n') k -= 1;
    let f = finIndex;
    if (!rognerAvant && gradle[f] === '\n') f += 1;
    return gradle.slice(0, k) + gradle.slice(f);
  };

  const i = gradle.indexOf(debut);
  if (i !== -1) {
    const j = gradle.indexOf(fin, i);
    if (j === -1) {
      throw new Error(
        `withReleaseSigning : bloc « ${debut} » ouvert mais jamais fermé dans build.gradle.`,
      );
    }
    return decoupe(i, j + fin.length);
  }
  if (historique && gradle.includes(historique)) {
    const h = gradle.indexOf(historique);
    return decoupe(h, h + historique.length);
  }
  return gradle;
}

/** Pure transform — exported for testing without running a full prebuild. */
function applyReleaseSigning(contents) {
  let gradle = contents;

  // 0) Table rase : toute injection précédente disparaît, sentinelles ou non.
  gradle = retirerInjection(gradle, SENT_LOADER_DEBUT, SENT_LOADER_FIN, LOADER_HISTORIQUE, {
    rognerAvant: true,
  });
  gradle = retirerInjection(gradle, SENT_SIGNING_DEBUT, SENT_SIGNING_FIN, SIGNING_HISTORIQUE, {
    rognerAvant: false,
  });

  // 1) Charger keystore.properties, juste après la définition de projectRoot.
  gradle = gradle.replace(/^(def projectRoot = .*)$/m, `$1\n\n${BLOC_LOADER}`);

  // 2) Poser la `signingConfig release` dans `signingConfigs { }`.
  gradle = gradle.replace(/(signingConfigs\s*\{\s*\n)/, `$1${BLOC_SIGNING}`);

  // 3) Pointer le buildType release dessus (et non sur la clé de débogage).
  gradle = gradle.replace(
    /(buildTypes\s*\{[\s\S]*?\brelease\s*\{[\s\S]*?signingConfig\s+)signingConfigs\.debug/,
    '$1signingConfigs.release',
  );

  return gradle;
}

const withReleaseSigning = (config) =>
  withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
      throw new Error(
        'withReleaseSigning is only supported for build.gradle (groovy) projects.',
      );
    }
    cfg.modResults.contents = applyReleaseSigning(cfg.modResults.contents);
    return cfg;
  });

/** Écrit `android/keystore.properties` depuis l'environnement, à chaque prebuild. */
const withProprietesKeystore = (config) =>
  withDangerousMod(config, [
    'android',
    async (cfg) => {
      const destination = path.join(cfg.modRequest.platformProjectRoot, 'keystore.properties');
      const { contenu, manquantes } = proprietesDepuisEnv(process.env);
      if (contenu === null) {
        // ⚠️ ON N'ÉCHOUE PAS ICI : un prebuild de développement est légitime sans
        // le keystore de production. C'est la tâche `release` de Gradle qui
        // refusera, au moment où l'absence compte vraiment.
        console.warn(
          `[withReleaseSigning] keystore.properties non généré — variables absentes : ${manquantes.join(', ')}. ` +
            'Les builds de release échoueront tant qu’elles ne sont pas définies (voir .env.example).',
        );
        return cfg;
      }
      fs.writeFileSync(destination, contenu, 'utf8');
      return cfg;
    },
  ]);

module.exports = (config) => withProprietesKeystore(withReleaseSigning(config));
module.exports.applyReleaseSigning = applyReleaseSigning;
module.exports.proprietesDepuisEnv = proprietesDepuisEnv;
module.exports.VARIABLES = VARIABLES;
