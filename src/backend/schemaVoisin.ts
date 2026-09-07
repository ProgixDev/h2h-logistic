// LE SCHÉMA DU DÉPÔT VOISIN, REJOUÉ EN MÉMOIRE — POUR LES TESTS SEULEMENT.
//
// 🔴 CE DÉPÔT NE POSSÈDE PAS SA BASE. Les tables, les fonctions et les tables
// de référence que l'application coursier lit vivent dans les migrations de
// `hand-to-hand`. Aucun contrôle sérieux n'est possible d'ici sans les rejouer :
// un fichier dit ce qu'on a écrit, une base dit ce qui est vrai.
//
// ⚠️ CE MODULE N'EST IMPORTÉ QUE PAR DES TESTS. Il tire `@electric-sql/pglite`,
// une devDependency : rien dans `src/app/` ne l'atteint, et rien ne doit
// l'atteindre — il n'a aucune raison de partir dans un paquet.
//
// ⚠️ LE PRÉLUDE ET LES ADAPTATIONS SONT COPIÉS DE
// `hand-to-hand/src/backend/*.test.ts`. Il n'existe pas de monorepo
// (`docs/backend/ARCHITECTURE.md` le dit) : la copie est le prix de la
// séparation des dépôts. Elle vit ICI, en un seul endroit, plutôt que dans
// chaque test — deux copies d'un shim finissent par diverger, et un shim qui
// diverge fait mentir la garde qu'il sert.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';

/** Le dépôt de la place de marché — il détient le schéma que ce dépôt appelle. */
export const DEPOT_VOISIN = process.env.H2H_MARKETPLACE
  ?? join(process.cwd(), '..', 'hand-to-hand');

export const DOSSIER_MIGRATIONS = join(DEPOT_VOISIN, 'supabase', 'migrations');

/** Le message d'échec quand le dépôt voisin manque — jamais un test ignoré. */
export const ABSENCE = `le dépôt de la place de marché est introuvable (${DEPOT_VOISIN}).\n`
  + 'Ce dépôt ne possède pas le schéma : sans les migrations voisines, il est '
  + 'IMPOSSIBLE de vérifier ce que l’application suppose de la base. Ce test '
  + 'échoue plutôt que de se taire — un contrôle vert qui n’a rien vérifié est '
  + 'pire que pas de contrôle.\n'
  + 'Cloner `hand-to-hand` à côté, ou donner son chemin dans H2H_MARKETPLACE.';

export const schemaVoisinPresent = (): boolean => existsSync(DOSSIER_MIGRATIONS);

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

// 🔴 PAS DE POSTGIS DANS PGlite : `geography(point,4326)` devient `text` et les
// index GiST sautent. Toutes les gardes de la place de marché font pareil —
// une distance calculable seulement en production est une distance qu'aucun
// test ne vérifie.
const adapter = (sql: string): string => sql
  .replace(/^create extension .*$/gim, '-- [shim] extension')
  .replace(/extensions\.geography\(point,\s*4326\)/g, 'text')
  .replace(/extensions\.citext/g, 'text')
  .replace(/^create index [^;]*using gist[^;]*;/gim, '-- [shim] gist')
  .replace(/^create index [^;]*trgm_ops[^;]*;/gim, '-- [shim] trgm');

/**
 * Rejoue toutes les migrations voisines et rend la base ouverte.
 *
 * ⚠️ L'APPELANT LA FERME (`await db.close()`), comme les gardes de la place de
 * marché : un test qui laisse PGlite ouvert retient le processus.
 */
export async function ouvrirSchemaVoisin(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(PRELUDE);
  // Les tables naissent larges : c'est ce que fait Supabase, et plusieurs
  // gardes reposent sur le fait de le reproduire fidèlement.
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
  return db;
}
