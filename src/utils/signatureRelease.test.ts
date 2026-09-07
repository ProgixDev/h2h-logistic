// LA SIGNATURE DE RELEASE N'AVAIT AUCUN FICHIER À LIRE.
//
// 🔴 CE QUI MANQUAIT, VÉRIFIÉ LE 07/09/2026. `plugins/withReleaseSigning.js`
// réinjecte à chaque `expo prebuild` une `signingConfig release` qui lit
// `android/keystore.properties`. Ce fichier n'existait sur aucun poste, et rien
// ne le produisait. Le dossier `android/` étant gitignoré et régénéré, il ne
// POUVAIT pas être écrit à la main durablement : le prebuild suivant l'effaçait.
//
// 🔴 ET L'ABSENCE ÉTAIT MUETTE. Le bloc est gardé par
// `if (keystoreProperties['storeFile'])` : sans le fichier, la `signingConfig`
// restait VIDE, `assembleRelease` réussissait, et sortait un `.apk` non signé —
// ininstallable, découvert au moment de publier.
//
// ⚠️ CE FICHIER TESTE LE PLUGIN LUI-MÊME, ce qu'aucun test ne faisait : il
// exportait `applyReleaseSigning` « for testing » depuis le début, et rien ne
// l'appelait.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const requis = createRequire(import.meta.url);
const plugin = requis('../../plugins/withReleaseSigning.js');
const { applyReleaseSigning, proprietesDepuisEnv, VARIABLES } = plugin;

const ENV_COMPLET = {
  H2H_ANDROID_KEYSTORE_PATH: 'C:\\dev\\h2h-keystores\\h2h-release.keystore',
  H2H_ANDROID_KEYSTORE_PASSWORD: 'mot-de-passe',
  H2H_ANDROID_KEY_ALIAS: 'h2h',
  H2H_ANDROID_KEY_PASSWORD: 'mot-de-passe',
};

// ── Le fichier produit ─────────────────────────────────────────────────────

test('🔴 SANS LES VARIABLES, RIEN N’EST ÉCRIT — et on sait lesquelles manquent', () => {
  const { contenu, manquantes } = proprietesDepuisEnv({});
  assert.equal(contenu, null, 'un fichier vide vaudrait un fichier absent');
  assert.deepEqual(manquantes.sort(), Object.values(VARIABLES).sort());
});

test('⚠️ UNE SEULE VARIABLE MANQUANTE SUFFIT À TOUT ARRÊTER', () => {
  // Un `keystore.properties` partiel est pire qu'absent : Gradle lirait un
  // `storeFile` sans mot de passe et échouerait bien plus loin.
  const { H2H_ANDROID_KEY_PASSWORD, ...incomplet } = ENV_COMPLET;
  const { contenu, manquantes } = proprietesDepuisEnv(incomplet);
  assert.equal(contenu, null);
  assert.deepEqual(manquantes, ['H2H_ANDROID_KEY_PASSWORD']);
});

test('🔴 LE CHEMIN WINDOWS S’ÉCRIT EN BARRES NORMALES', () => {
  // ⚠️ LE PIÈGE DU FORMAT. Dans un `.properties` Java, `\` est un ÉCHAPPEMENT :
  // `C:\dev\h2h-keystores\...` se relit `C:devh2h-keystores...`, et Gradle
  // cherche un fichier qui n'a jamais existé. Java accepte `/` sur Windows.
  const { contenu } = proprietesDepuisEnv(ENV_COMPLET);
  assert.match(contenu, /^storeFile=C:\/dev\/h2h-keystores\/h2h-release\.keystore$/m);
  assert.ok(!contenu.includes('C:dev'), 'les séparateurs ont été avalés');
});

test('⚠️ LES QUATRE CLÉS SONT CELLES QUE LE GRADLE LIT', () => {
  const { contenu } = proprietesDepuisEnv(ENV_COMPLET);
  for (const cle of ['storeFile', 'storePassword', 'keyAlias', 'keyPassword']) {
    assert.match(contenu, new RegExp(`^${cle}=`, 'm'), `${cle} absent du fichier`);
  }
  assert.equal(contenu.trim().split('\n').length, 4);
});

test('🔴 AUCUNE VARIABLE NE PORTE LE PRÉFIXE `EXPO_PUBLIC_`', () => {
  // Metro INJECTE DANS LE BUNDLE tout ce qui porte ce préfixe : le mot de passe
  // du keystore partirait dans le `.apk` qu'il est censé protéger.
  for (const nom of Object.values(VARIABLES) as string[]) {
    assert.ok(!nom.startsWith('EXPO_PUBLIC_'), `${nom} finirait dans le paquet`);
  }
});

// ── La transformation du build.gradle ──────────────────────────────────────

const GRADLE_NEUF = `
def projectRoot = rootDir.getAbsoluteFile().getParentFile().getAbsolutePath()

android {
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.debug
            minifyEnabled false
        }
    }
}
`;

test('🔴 LA RELEASE NE SIGNE PLUS AVEC LA CLÉ DE DÉBOGAGE', () => {
  const sortie = applyReleaseSigning(GRADLE_NEUF);
  assert.match(sortie, /signingConfig signingConfigs\.release/);
  assert.ok(
    !/buildTypes[\s\S]*release\s*\{[\s\S]*signingConfig signingConfigs\.debug/.test(sortie),
    'le buildType release pointe encore sur la clé de débogage',
  );
});

test('🔴 UNE RELEASE SANS KEYSTORE ÉCHOUE, ELLE NE SORT PLUS EN SILENCE', () => {
  // C'est le cœur du correctif : avant, `assembleRelease` réussissait.
  const sortie = applyReleaseSigning(GRADLE_NEUF);
  assert.match(sortie, /gradle\.taskGraph\.whenReady/);
  assert.match(sortie, /throw new GradleException/);
  // Et le message dit QUOI faire, pas seulement que c'est cassé.
  assert.match(sortie, /H2H_ANDROID_KEYSTORE_PATH/);
  assert.match(sortie, /expo prebuild/);
});

test('⚠️ LA TRANSFORMATION EST IDEMPOTENTE — prebuild la rejoue à chaque fois', () => {
  const une = applyReleaseSigning(GRADLE_NEUF);
  const deux = applyReleaseSigning(une);
  assert.equal(deux, une, 'un second passage a dupliqué la configuration');
  // Une seule DÉCLARATION — le nom réapparaît ensuite dans `.exists()` et dans
  // le `FileInputStream`, ce qui est normal.
  assert.equal((une.match(/def keystorePropertiesFile/g) ?? []).length, 1);
  assert.equal((une.match(/storeFile file\(keystoreProperties/g) ?? []).length, 1);
});

// ── La mise a niveau d'une injection deja presente ─────────────────────────
//
// 🔴 LE DEFAUT QUE CES DEUX TESTS FIXENT. `expo prebuild` SANS `--clean`
// REUTILISE le `android/` existant : le mod tourne donc sur un `build.gradle`
// qui porte deja une injection. Les gardes d'origine se contentaient de
// verifier « est-ce deja la ? » et sautaient l'etape — donc toute EVOLUTION du
// plugin restait invisible. Verifie le 07/09/2026 : le garde-fou ajoute ce
// jour-la n'est jamais arrive dans le fichier genere, et `assembleRelease`
// serait reste muet malgre le correctif.

const GRADLE_ANCIENNE_INJECTION = [
  '',
  'def projectRoot = rootDir.getAbsoluteFile().getParentFile().getAbsolutePath()',
  '',
  'def keystorePropertiesFile = rootProject.file("keystore.properties")',
  'def keystoreProperties = new Properties()',
  'if (keystorePropertiesFile.exists()) {',
  '    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))',
  '}',
  '',
  'android {',
  '    signingConfigs {',
  '        release {',
  "            if (keystoreProperties['storeFile']) {",
  "                storeFile file(keystoreProperties['storeFile'])",
  "                storePassword keystoreProperties['storePassword']",
  "                keyAlias keystoreProperties['keyAlias']",
  "                keyPassword keystoreProperties['keyPassword']",
  '            }',
  '        }',
  '        debug {',
  '        }',
  '    }',
  '    buildTypes {',
  '        release {',
  '            signingConfig signingConfigs.release',
  '        }',
  '    }',
  '}',
  '',
].join('\n');

test('🔴 UNE INJECTION DEJA PRESENTE EST MISE A NIVEAU, PAS IGNOREE', () => {
  const sortie = applyReleaseSigning(GRADLE_ANCIENNE_INJECTION);
  assert.match(sortie, /gradle\.taskGraph\.whenReady/, 'le garde-fou n’a pas ete ajoute');
  assert.match(sortie, /throw new GradleException/);
});

test('🔴 ET RIEN N’EST DOUBLE AU PASSAGE', () => {
  // Un second `def keystorePropertiesFile` ferait echouer Groovy ; un second
  // bloc `release {` dans `signingConfigs` serait accepte et imprevisible.
  const sortie = applyReleaseSigning(GRADLE_ANCIENNE_INJECTION);
  assert.equal((sortie.match(/def keystorePropertiesFile/g) ?? []).length, 1);
  assert.equal((sortie.match(/storeFile file\(keystoreProperties/g) ?? []).length, 1);
  // Et un troisieme passage ne bouge plus.
  assert.equal(applyReleaseSigning(sortie), sortie);
});
