// LE COTRANSPORTEUR APPELLE DES FONCTIONS QU'IL NE POSSÈDE PAS.
//
// 🔴 LA GARDE MIROIR QUI MANQUAIT. La place de marché tient
// `src/backend/aucuneRpcOrpheline.test.ts` : elle demande « cette fonction est
// accordée aux clients — qui l'appelle ? » et attrape la fonctionnalité qui
// n'existe pas sous l'apparence du travail fait. Elle a servi trois fois.
//
// Le cotransporteur avait besoin de la question INVERSE, et ne l'avait pas :
// « cette fonction est appelée — existe-t-elle encore ? ». Les deux défauts
// sont distincts, et aucun des deux ne rattrape l'autre.
//
// 🔴 ET LE RISQUE EST PLUS GRAND ICI, PARCE QUE CE DÉPÔT NE POSSÈDE PAS LE
// SCHÉMA. Les fonctions appelées d'ici vivent dans les migrations de
// `hand-to-hand`. Un renommage, un `revoke`, une fonction retirée : rien, dans
// ce dépôt, ne s'en aperçoit. `tsc` est vert, le lint est vert, les tests sont
// verts — et l'écran échoue sous le doigt de l'utilisateur, en production, sur
// une erreur PostgREST que personne ne verra avant lui.
//
// ⚠️ LE NOM SEUL NE SUFFIT PAS : LES PARAMÈTRES COMPTENT AUTANT. PostgREST
// transmet l'objet JSON en paramètres NOMMÉS. `p_mission_id` renommé `p_id`
// côté migration ne casse aucune compilation et casse TOUS les appels. D'où la
// vérification des noms d'arguments — et des arguments obligatoires oubliés —
// et pas seulement de l'existence de la fonction.
//
// 🔴 ET LE TROISIÈME CONTRÔLE FERME UN ANGLE MORT DE L'AUTRE DÉPÔT.
// `aucuneRpcOrpheline.test.ts` exempte des fonctions « appelées par l'app
// coursier », et son commentaire réclame lui-même de pouvoir être contredit :
// « Une entrée qui dit seulement "appelée par l'app coursier" est une entrée
// qu'on ne peut pas contredire — donc inutile. » La contradiction se construit
// D'ICI. Chaque exemption nomme un fichier de ce dépôt : on va voir s'il existe
// et s'il fait vraiment l'appel. Sans ça, supprimer un écran ici laisse là-bas
// une fonction réellement orpheline, protégée par une exemption périmée.
//
// ⚠️ CE TEST ÉCHOUE QUAND LE DÉPÔT VOISIN EST ABSENT — IL NE S'IGNORE PAS. Un
// contrôle qui passe au vert parce qu'il n'a rien pu vérifier est exactement le
// défaut que toute cette famille de gardes existe pour empêcher. Si les deux
// dépôts ne sont pas côte à côte, `H2H_MARKETPLACE` donne le chemin.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';

const RACINE = join(process.cwd(), 'src');

/** Le dépôt de la place de marché — il détient le schéma que ce dépôt appelle. */
const DEPOT_VOISIN = process.env.H2H_MARKETPLACE
  ?? join(process.cwd(), '..', 'hand-to-hand');

const DOSSIER_MIGRATIONS = join(DEPOT_VOISIN, 'supabase', 'migrations');
const GARDE_VOISINE = join(DEPOT_VOISIN, 'src', 'backend', 'aucuneRpcOrpheline.test.ts');

const ABSENCE = `le dépôt de la place de marché est introuvable (${DEPOT_VOISIN}).\n`
  + 'Ce dépôt ne possède pas le schéma : sans les migrations voisines, il est '
  + 'IMPOSSIBLE de savoir si les fonctions appelées ici existent encore. Ce test '
  + 'échoue plutôt que de se taire — un contrôle vert qui n’a rien vérifié est '
  + 'pire que pas de contrôle.\n'
  + 'Cloner `hand-to-hand` à côté, ou donner son chemin dans H2H_MARKETPLACE.';

// ── LE CODE QUE LES ÉCRANS ATTEIGNENT VRAIMENT ─────────────────────────────
//
// 🔴 MÊME RAISONNEMENT QUE `aucuneRpcOrpheline.test.ts` DEPUIS LE 07/09/2026,
// et pour le même défaut vécu : `services/presenceHub.ts` appelait
// `declarer_presence_hub`, et n'était importé QUE POUR UN TYPE. La règle de
// révélation GPS était complète en base, testée, accordée — et inatteignable.
// Un appel dans un module que personne n'importe n'est pas un appel : c'est du
// code mort qui a l'air d'un appel.
//
// ⚠️ LA SEULE RACINE EST `src/app/` : `expo-router` la balaie avec un
// `require.context`, tout ce qui s'exécute part de là.

const EXTENSIONS = ['.ts', '.tsx', '.web.ts', '.web.tsx', '.ios.tsx', '.android.tsx'];

const resoudre = (specificateur: string, depuis: string): string[] => {
  const base = specificateur.startsWith('@/')
    ? join(process.cwd(), 'src', specificateur.slice(2))
    : specificateur.startsWith('.')
      ? join(depuis, '..', specificateur)
      : null;
  if (base === null) return []; // paquet npm — hors de notre graphe

  const trouves: string[] = [];
  for (const ext of EXTENSIONS) {
    for (const candidat of [base + ext, join(base, `index${ext}`)]) {
      try {
        if (statSync(candidat).isFile()) trouves.push(candidat);
      } catch {
        /* pas ce candidat */
      }
    }
  }
  return trouves;
};

const fichiers = (dir: string, acc: string[] = []): string[] => {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) fichiers(p, acc);
    else if (/\.tsx?$/.test(e) && !/\.test\.tsx?$/.test(e)) acc.push(p);
  }
  return acc;
};

/** Les fichiers réellement atteignables depuis un écran. */
const atteignables = (): Set<string> => {
  const vus = new Set<string>();
  const aVisiter = fichiers(join(RACINE, 'app'));

  while (aVisiter.length > 0) {
    const fichier = aVisiter.pop() as string;
    if (vus.has(fichier)) continue;
    vus.add(fichier);

    // 🔴 LES IMPORTS DE TYPE NE COMPTENT PAS. `import type { X } from '…'` est
    // EFFACÉ à la compilation : le module n'est jamais chargé, son code ne
    // s'exécute jamais. C'est très exactement ce qui masquait `presenceHub.ts`.
    const executable = readFileSync(fichier, 'utf8')
      .replace(/^\s*import\s+type\s+[^;]*?;/gm, '')
      .replace(/^\s*export\s+type\s+[^;]*?;/gm, '');

    const specificateurs = [
      ...executable.matchAll(/from\s+['"]([^'"]+)['"]/g),
      ...executable.matchAll(/require\(\s*['"]([^'"]+)['"]\s*\)/g),
      ...executable.matchAll(/import\(\s*['"]([^'"]+)['"]\s*\)/g),
    ].map((m) => m[1]);

    for (const spec of specificateurs) {
      for (const cible of resoudre(spec, fichier)) {
        if (!vus.has(cible)) aVisiter.push(cible);
      }
    }
  }
  return vus;
};

// ── LIRE LES APPELS, PARAMÈTRES COMPRIS ────────────────────────────────────
//
// ⚠️ CE PETIT ANALYSEUR ÉCHOUE FORT PLUTÔT QUE DE RENDRE MOINS. Une clé
// manquée serait un paramètre non vérifié, donc une garde qui rassure à tort :
// tout ce qu'il ne sait pas lire lève une erreur nommant le fichier.

type Appel = { nom: string; args: string[]; fichier: string; ligne: number };

/** Les clés de premier niveau d'un objet littéral commençant à `debut`. */
const clesObjet = (src: string, debut: number, ou: string): string[] => {
  const cles: string[] = [];
  let i = debut + 1; // après le `{`

  const passerBlancs = () => {
    while (i < src.length) {
      if (/\s/.test(src[i])) { i += 1; continue; }
      if (src.startsWith('//', i)) { i = src.indexOf('\n', i) + 1 || src.length; continue; }
      if (src.startsWith('/*', i)) { i = src.indexOf('*/', i) + 2; continue; }
      break;
    }
  };

  /** Avance jusqu'à la virgule de premier niveau, ou au `}` qui referme. */
  const passerValeur = (): 'suite' | 'fin' => {
    let profondeur = 0;
    while (i < src.length) {
      const c = src[i];
      if (c === '\'' || c === '"' || c === '`') {
        const guillemet = c;
        i += 1;
        while (i < src.length && src[i] !== guillemet) i += src[i] === '\\' ? 2 : 1;
        i += 1;
        continue;
      }
      if (c === '{' || c === '[' || c === '(') { profondeur += 1; i += 1; continue; }
      if (c === '}' || c === ']' || c === ')') {
        if (profondeur === 0) { i += 1; return 'fin'; }
        profondeur -= 1; i += 1; continue;
      }
      if (c === ',' && profondeur === 0) { i += 1; return 'suite'; }
      i += 1;
    }
    throw new Error(`${ou} : objet de paramètres non refermé`);
  };

  for (;;) {
    passerBlancs();
    if (i >= src.length) throw new Error(`${ou} : objet de paramètres non refermé`);
    if (src[i] === '}') return cles;

    const cle = /^([A-Za-z_$][\w$]*)\s*:/.exec(src.slice(i));
    if (!cle) {
      throw new Error(
        `${ou} : paramètre illisible (« ${src.slice(i, i + 40).split('\n')[0]} »). `
        + 'Un `...spread`, une clé calculée ou une clé abrégée rendrait les '
        + 'paramètres invérifiables — les écrire en toutes lettres.',
      );
    }
    cles.push(cle[1]);
    i += cle[0].length;
    if (passerValeur() === 'fin') return cles;
  }
};

const lireAppels = (chemin: string): Appel[] => {
  const src = readFileSync(chemin, 'utf8');
  const appels: Appel[] = [];
  const re = /\.rpc\(\s*(['"])([A-Za-z0-9_]+)\1/g;
  let m: RegExpExecArray | null;

  while ((m = re.exec(src)) !== null) {
    const nom = m[2];
    const ou = `${chemin.replace(process.cwd(), '.')} : rpc('${nom}')`;
    let i = re.lastIndex;
    while (i < src.length && /\s/.test(src[i])) i += 1;

    let args: string[] = [];
    if (src[i] === ',') {
      i += 1;
      while (i < src.length && /\s/.test(src[i])) i += 1;
      if (src[i] !== '{') {
        throw new Error(`${ou} : les paramètres ne sont pas un objet littéral — invérifiables`);
      }
      args = clesObjet(src, i, ou);
    } else if (src[i] !== ')') {
      throw new Error(`${ou} : appel de forme inattendue`);
    }

    appels.push({
      nom,
      args,
      fichier: chemin.replace(process.cwd(), '.'),
      ligne: src.slice(0, m.index).split('\n').length,
    });
  }
  return appels;
};

const TOUS = fichiers(RACINE);
const JOIGNABLES = atteignables();
const APPELS = TOUS.flatMap(lireAppels);

// ── LE SCHÉMA VOISIN, REJOUÉ ───────────────────────────────────────────────
//
// ⚠️ PRÉLUDE ET ADAPTATIONS COPIÉS DE `hand-to-hand/src/backend/*.test.ts`. Il
// n'existe pas de monorepo (`docs/backend/ARCHITECTURE.md` le dit), donc pas de
// module partagé : la copie est le prix de la séparation des dépôts.
//
// 🔴 PAS DE POSTGIS DANS PGlite : `geography(point,4326)` devient `text` et les
// index GiST sautent. Toutes les gardes de la place de marché font pareil.

const PRELUDE = `
create schema if not exists auth;
create schema if not exists extensions;
create schema if not exists storage;
create table if not exists storage.buckets (
  id text primary key, name text not null, public boolean not null default false,
  file_size_limit bigint, allowed_mime_types text[],
  created_at timestamptz not null default now()
);
create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id), name text, owner uuid,
  created_at timestamptz not null default now()
);
alter table storage.objects enable row level security;
create or replace function storage.foldername(name text) returns text[]
  language plpgsql immutable as $fold$
declare parts text[];
begin
  parts := string_to_array(name, '/');
  return parts[1 : array_length(parts, 1) - 1];
end $fold$;

create schema if not exists realtime;
create table if not exists realtime.messages (
  id uuid not null default gen_random_uuid(), topic text not null, extension text,
  payload jsonb, event text, private boolean default false,
  inserted_at timestamp not null default now(), updated_at timestamp not null default now()
);
alter table realtime.messages enable row level security;
create or replace function realtime.topic() returns text
  language sql stable as $rt$ select current_setting('realtime.topic', true) $rt$;
create or replace function realtime.send(
  payload jsonb, event text, topic text, private boolean default true)
  returns void language plpgsql as $rs$
begin
  insert into realtime.messages (topic, event, payload, private, extension)
  values (topic, event, payload, private, 'broadcast');
end $rs$;
create or replace function realtime.broadcast_changes(
  topic_name text, event_name text, operation text, table_name text,
  table_schema text, new record, old record, level text default 'ROW')
  returns void language plpgsql as $rb$
begin
  perform realtime.send(
    jsonb_build_object('operation', operation, 'schema', table_schema,
                       'table', table_name, 'record', to_jsonb(new)),
    event_name, topic_name, true);
end $rb$;

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role; end if;
end $$;
grant usage on schema realtime to authenticated, anon;
grant select on realtime.messages to authenticated;
`;

const adapter = (sql: string): string => sql
  .replace(/^create extension .*$/gim, '-- [shim] extension')
  .replace(/extensions\.geography\(point,\s*4326\)/g, 'text')
  .replace(/extensions\.citext/g, 'text')
  .replace(/^create index [^;]*using gist[^;]*;/gim, '-- [shim] gist')
  .replace(/^create index [^;]*trgm_ops[^;]*;/gim, '-- [shim] trgm');

type Signature = { args: string[]; obligatoires: string[]; accordee: boolean };

const schema = new Map<string, Signature[]>();

if (existsSync(DOSSIER_MIGRATIONS)) {
  const db = new PGlite();
  await db.exec(PRELUDE);
  await db.exec(`
    alter default privileges in schema public
      grant select, insert, update, delete on tables to authenticated;
    alter default privileges in schema public grant select on tables to anon;
    alter default privileges in schema public grant usage on sequences to authenticated;
    grant usage on schema auth, public to authenticated, anon;
  `);
  for (const f of readdirSync(DOSSIER_MIGRATIONS).filter((n) => n.endsWith('.sql')).sort()) {
    await db.exec(adapter(readFileSync(join(DOSSIER_MIGRATIONS, f), 'utf8')));
  }

  // ⚠️ SEULS LES ARGUMENTS D'ENTRÉE COMPTENT. `proargnames` contient aussi les
  // colonnes des fonctions `returns table(…)` ; les prendre pour des paramètres
  // ferait passer n'importe quoi.
  const lignes = (await db.query(`
    select p.proname as nom,
           has_function_privilege('authenticated', p.oid, 'execute') as accordee,
           p.pronargs as nb_args,
           coalesce(p.pronargdefaults, 0) as nb_defauts,
           coalesce((
             select array_agg(t.nom order by t.i)
               from unnest(p.proargnames) with ordinality as t(nom, i)
              where p.proargmodes is null or p.proargmodes[t.i] in ('i', 'b', 'v')
           ), '{}'::text[]) as args
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.prokind = 'f'
  `)).rows as { nom: string; accordee: boolean; nb_args: number; nb_defauts: number; args: string[] }[];

  for (const l of lignes) {
    const args = l.args ?? [];
    const signatures = schema.get(l.nom) ?? [];
    signatures.push({
      args,
      // Les paramètres à valeur par défaut sont les DERNIERS de la liste.
      obligatoires: args.slice(0, Math.max(0, l.nb_args - l.nb_defauts)),
      accordee: l.accordee,
    });
    schema.set(l.nom, signatures);
  }
  await db.close();
}

test('🔴 TOUTE FONCTION APPELÉE EXISTE, ET EST ACCORDÉE AUX CLIENTS', () => {
  assert.ok(existsSync(DOSSIER_MIGRATIONS), ABSENCE);

  const fautifs: string[] = [];
  for (const nom of [...new Set(APPELS.map((a) => a.nom))].sort()) {
    const signatures = schema.get(nom);
    const ou = APPELS.filter((a) => a.nom === nom)
      .map((a) => `${a.fichier}:${a.ligne}`).join(', ');
    if (!signatures) fautifs.push(`${nom} — N'EXISTE PAS dans public (${ou})`);
    else if (!signatures.some((s) => s.accordee)) {
      fautifs.push(`${nom} — existe mais N'EST PAS accordée à authenticated (${ou})`);
    }
  }

  assert.deepEqual(
    fautifs,
    [],
    `${fautifs.length} appel(s) que la base ne peut pas honorer :\n  `
    + `${fautifs.join('\n  ')}\n\n`
    + 'Ce dépôt ne possède pas le schéma : une fonction renommée ou retirée '
    + 'là-bas ne casse rien ici avant l’écran de l’utilisateur.',
  );
});

test('🔴 ET LES PARAMÈTRES PORTENT LES NOMS QUE LA BASE ATTEND', () => {
  assert.ok(existsSync(DOSSIER_MIGRATIONS), ABSENCE);

  // ⚠️ POSTGREST TRANSMET DES PARAMÈTRES NOMMÉS. Une clé inconnue et un
  // paramètre obligatoire oublié échouent tous les deux à l'appel — et aucun
  // des deux ne fait broncher `tsc`, qui ne connaît pas la signature.
  const fautifs: string[] = [];
  for (const appel of APPELS) {
    const signatures = schema.get(appel.nom);
    if (!signatures) continue; // déjà signalé par le test précédent

    const compatible = signatures.some((s) => {
      const inconnus = appel.args.filter((a) => !s.args.includes(a));
      const manquants = s.obligatoires.filter((a) => !appel.args.includes(a));
      return inconnus.length === 0 && manquants.length === 0;
    });
    if (compatible) continue;

    const s = signatures[0];
    const inconnus = appel.args.filter((a) => !s.args.includes(a));
    const manquants = s.obligatoires.filter((a) => !appel.args.includes(a));
    fautifs.push(
      `${appel.fichier}:${appel.ligne} ${appel.nom}(…)`
      + (inconnus.length > 0 ? `\n      paramètre(s) inconnu(s) : ${inconnus.join(', ')}` : '')
      + (manquants.length > 0 ? `\n      obligatoire(s) oublié(s) : ${manquants.join(', ')}` : '')
      + `\n      la base attend : ${s.args.join(', ') || '(aucun)'}`,
    );
  }

  assert.deepEqual(
    fautifs,
    [],
    `${fautifs.length} appel(s) dont les paramètres ne correspondent pas :\n  `
    + `${fautifs.join('\n  ')}`,
  );
});

test('🔴 AUCUN APPEL DEPUIS DU CODE QU’AUCUN ÉCRAN N’ATTEINT', () => {
  // C'est le défaut de `services/presenceHub.ts` : appelée, testée, accordée —
  // et importée seulement pour un type, donc jamais exécutée.
  const morts = APPELS
    .filter((a) => !JOIGNABLES.has(join(process.cwd(), a.fichier.slice(2))))
    .map((a) => `${a.fichier}:${a.ligne} → ${a.nom}`);

  assert.deepEqual(
    morts,
    [],
    `${morts.length} appel(s) dans du code que nul écran n'importe :\n  `
    + `${morts.join('\n  ')}\n\n`
    + 'Un appel dans un module que personne n’importe n’est pas un appel : '
    + 'c’est du code mort qui a l’air d’un appel.',
  );
});

test('⚠️ AUCUN NOM DE FONCTION CALCULÉ — SINON CETTE GARDE NE VOIT RIEN', () => {
  // `supabase.rpc(nom)` serait invisible pour tout ce qui précède : la garde
  // resterait verte en ne regardant rien.
  const fautifs: string[] = [];
  for (const chemin of TOUS) {
    const src = readFileSync(chemin, 'utf8');
    const total = (src.match(/\.rpc\(/g) ?? []).length;
    const litteraux = (src.match(/\.rpc\(\s*['"][A-Za-z0-9_]+['"]/g) ?? []).length;
    if (total !== litteraux) {
      fautifs.push(`${chemin.replace(process.cwd(), '.')} : ${total - litteraux} appel(s) au nom calculé`);
    }
  }
  assert.deepEqual(fautifs, [], `nom(s) de fonction non littéraux :\n  ${fautifs.join('\n  ')}`);
});

test('⚠️ LES EXEMPTIONS DE LA PLACE DE MARCHÉ DISENT VRAI', () => {
  assert.ok(existsSync(GARDE_VOISINE), ABSENCE);

  const source = readFileSync(GARDE_VOISINE, 'utf8');
  const debut = source.indexOf('const ADMISES');
  assert.notEqual(debut, -1, `${GARDE_VOISINE} n'expose plus de liste ADMISES — cette garde est à revoir`);

  // 🔴 ON RETIRE LES COMMENTAIRES AVANT DE DÉCOUPER, ET C'EST INDISPENSABLE.
  // La première version de ce test attribuait à `peut_ecouter_live_public` des
  // chemins qui appartenaient au commentaire de l'entrée SUIVANTE — le bloc
  // « ✅ record_scan_event a quitté cette liste ». L'exemption paraissait donc
  // fausse alors qu'elle est muette. C'est le même piège que partout ailleurs
  // ici : le commentaire qui explique une chose en contient le texte.
  const brut = source.slice(source.indexOf('{', debut), source.indexOf('\n};', debut));
  const bloc = brut.split('\n').filter((l) => !l.trimStart().startsWith('//')).join('\n');
  const cles = [...bloc.matchAll(/^ {2}([a-z_][a-z0-9_]*):/gm)];
  assert.ok(cles.length > 0, 'liste ADMISES illisible — le découpage est à revoir');

  const fautifs: string[] = [];
  let verifiees = 0;

  for (let i = 0; i < cles.length; i += 1) {
    const nom = cles[i][1];
    const fin = i + 1 < cles.length ? (cles[i + 1].index as number) : bloc.length;
    const texte = bloc.slice(cles[i].index as number, fin);
    const chemins = [...texte.matchAll(/h2h-logistic\/([A-Za-z0-9_\-./[\]]+\.tsx?)/g)].map((m) => m[1]);
    if (chemins.length === 0) continue; // exemption qui ne parle pas de ce dépôt

    verifiees += 1;
    const absents = chemins.filter((c) => !existsSync(join(process.cwd(), c)));
    if (absents.length > 0) {
      fautifs.push(`${nom} — fichier(s) nommé(s) qui n'existent plus : ${absents.join(', ')}`);
      continue;
    }
    const appelant = chemins.some((c) => {
      const src = readFileSync(join(process.cwd(), c), 'utf8');
      return src.includes(`rpc('${nom}'`) || src.includes(`rpc("${nom}"`);
    });
    if (!appelant) {
      fautifs.push(
        `${nom} — aucun des fichiers nommés ne l'appelle : ${chemins.join(', ')}`,
      );
    }
  }

  assert.deepEqual(
    fautifs,
    [],
    `${fautifs.length} exemption(s) périmée(s) dans ${GARDE_VOISINE.replace(/\\/g, '/')} `
    + `(${verifiees} vérifiée(s)) :\n  ${fautifs.join('\n  ')}\n\n`
    + 'Une exemption qui survit à son appelant rend la garde voisine aveugle : '
    + 'la fonction y est comptée « appelée par l’app coursier » alors que plus '
    + 'personne ne l’appelle nulle part.',
  );
});
