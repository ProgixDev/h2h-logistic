// Le client Supabase, authentifié par Clerk.
//
// Il n'y a PAS de session Supabase Auth ici. Le jeton vient de Clerk, et
// Supabase le vérifie via l'intégration « third-party auth » (JWKS de
// awake-falcon-77.clerk.accounts.dev). Côté base, `app.uid()` traduit le
// `sub` Clerk (texte, « user_2… ») en UUID interne via profiles.auth_user_id.
//
// ⚠️ NE JAMAIS appeler supabase.auth.signIn*/signUp* : ces méthodes créeraient
// une identité Supabase parallèle à celle de Clerk, et deux identités pour la
// même personne, c'est deux profils — donc un cotransporteur qui ne peut plus
// acheter avec son compte.
import { createClient } from '@supabase/supabase-js';
import { clerkCharge, peekClerk } from './clerkBridge';
import { jetonBientotFini } from '@/utils/jetonExpire';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const cle = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

if (!url || !cle) {
  throw new Error(
    'EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY manquants dans .env.local',
  );
}

export const supabase = createClient(url, cle, {
  auth: {
    // Rien à persister ni à rafraîchir : la session appartient à Clerk.
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  // Rappelé à CHAQUE requête. Clerk renouvelle le jeton tout seul (durée de
  // vie 60 s) ; on ne met donc rien en cache ici, sinon on enverrait un jeton
  // expiré et la requête repartirait en « anon » sans le dire.
  // 🔴 LE GABARIT « supabase » N'EST PAS UN DÉTAIL : SANS LUI, TOUT PASSE EN
  // « anon ». Supabase choisit le rôle Postgres d'après la revendication `role`
  // du jeton. Le jeton de session Clerk PAR DÉFAUT n'en porte aucune — la
  // requête est donc authentifiée (le `sub` arrive, `app.uid()` répond) mais
  // exécutée en `anon`.
  //
  // ⚠️ ET ÇA NE SE VOYAIT PAS. Tout ce que `anon` a le droit de lire — le
  // catalogue, les fiches, les profils publics — fonctionnait parfaitement.
  // Seules les fonctions réservées à `authenticated` échouaient, et la première
  // à l'être vraiment est `passer_commande` : « permission denied for function
  // passer_commande » au moment de payer, découvert à l'émulateur.
  //
  // ⚠️ ON NE MET TOUJOURS RIEN EN CACHE : Clerk renouvelle le jeton tout seul
  // (durée de vie 60 s). Un jeton gardé serait expiré, et la requête repartirait
  // en « anon » sans le dire.
  //
  // 🔴 ET ON ATTEND QUE CLERK AIT FINI DE SE CHARGER (`clerkCharge`). Sans
  // l'attente, une requête partie avant le montage du pont concluait « personne »
  // et tournait en « anon » : zéro ligne, présentée comme une liste vide.
  //
  // 🔴 LE CACHE DE CLERK PEUT SERVIR UN JETON PÉRIMÉ AU RETOUR DE L'ARRIÈRE-PLAN
  // (vu à l'émulateur le 08/10/2026 : « JWT expired » à la première requête).
  // Il s'évince par un minuteur, et un minuteur ne tourne pas application
  // suspendue. On lit donc la fin du jeton servi, et on en redemande un frais
  // s'il est fini ou presque (`utils/jetonExpire`).
  accessToken: async () => {
    await clerkCharge();
    const clerk = peekClerk();
    if (!clerk?.session) return null;
    const jeton = await clerk.session.getToken({ template: 'supabase' });
    if (jeton && jetonBientotFini(jeton, 5)) {
      return (await clerk.session.getToken({ template: 'supabase', skipCache: true })) ?? null;
    }
    return jeton ?? null;
  },
});
