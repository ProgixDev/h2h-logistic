// LE TÉLÉPHONE DU COTRANSPORTEUR SE FAIT CONNAÎTRE — sans quoi une proposition
// de vingt minutes n'atteint personne.
//
// 🔴 CETTE APPLICATION N'ENREGISTRAIT AUCUN APPAREIL. `device_tokens` porte une
// colonne `app` (`marketplace | logistic | relais`) depuis l'origine, mais seule
// la place de marché s'y inscrivait : une proposition — vingt minutes pour y
// répondre (§ 5.2.1 des CGU H2H Logistic) — attendait que le cotransporteur
// ouvre l'application et pense à regarder. Le serveur adresse désormais chaque
// avis à UNE application (`notifications.app`) : celles d'un cotransporteur
// viennent ici, et seulement ici.
//
// ⚠️ `expo-notifications` SE CHARGE À LA DEMANDE, PAS À L'IMPORT. Son import
// statique déclenche l'auto-enregistrement du jeton au chargement du module ;
// dans Expo Go (SDK 53+), qui ne porte plus le push distant, c'est un écran
// rouge au démarrage — même raison que `settings/index.tsx`. Dans Expo Go, ce
// fichier ne fait donc rien : le push ne se vérifie que sur une build.
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { supabase } from '@/lib/supabase';
import { routeSuivable } from '@/utils/routeNotification';

type ModuleNotifications = typeof import('expo-notifications');
let charge: ModuleNotifications | null | undefined;

/** Le module, ou `null` là où le push n'existe pas (Expo Go, module absent). */
function notifications(): ModuleNotifications | null {
  if (charge !== undefined) return charge;
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    charge = null;
    return charge;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    charge = require('expo-notifications') as ModuleNotifications;
  } catch {
    charge = null;
  }
  return charge;
}

/**
 * L'identifiant du projet EAS, exigé par `getExpoPushTokenAsync`.
 * ⚠️ IL VIT DANS `app.json` (`extra.eas.projectId`) : le recopier créerait deux vérités.
 */
function idProjet(): string | null {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? null;
}

/**
 * Enregistre ce téléphone pour ce profil, au nom de H2H Logistic. Rend le jeton, ou `null`.
 *
 * ⚠️ `null` N'EST PAS UNE PANNE : Expo Go, permission refusée, identifiants
 * d'envoi absents. On n'a donc le droit ni de lever, ni de boucler — une
 * inscription au push ne doit jamais empêcher d'utiliser l'application.
 */
export async function enregistrerAppareil(profileId: string): Promise<string | null> {
  const N = notifications();
  if (!profileId || !N) return null;

  try {
    // ⚠️ SANS CE GESTIONNAIRE, UN PUSH REÇU APPLICATION OUVERTE NE S'AFFICHE PAS :
    // c'est le comportement par défaut d'`expo-notifications`. Une proposition de
    // vingt minutes arrivée pendant qu'on regarde ses trajets passerait inaperçue.
    N.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    // ⚠️ ANDROID EXIGE UN CANAL AVANT LA PREMIÈRE NOTIFICATION, et c'est lui qui
    // décide du bandeau. Une proposition a vingt minutes : importance HAUTE, pour
    // qu'elle s'affiche par-dessus l'écran en cours plutôt que dans la liste.
    if (Platform.OS === 'android') {
      await N.setNotificationChannelAsync('default', {
        name: 'Propositions et co-livraisons',
        importance: N.AndroidImportance.HIGH,
        lockscreenVisibility: N.AndroidNotificationVisibility.PRIVATE,
      });
    }

    const { status: existant } = await N.getPermissionsAsync();
    let accorde = existant === 'granted';
    if (!accorde) {
      const { status } = await N.requestPermissionsAsync();
      accorde = status === 'granted';
    }
    if (!accorde) return null;

    const projet = idProjet();
    if (!projet) {
      console.warn('[push] aucun projectId EAS : jeton impossible');
      return null;
    }
    const { data: jeton } = await N.getExpoPushTokenAsync({ projectId: projet });
    if (!jeton) return null;

    // ⚠️ `onConflict` SUR LE JETON, PAS SUR LE PROFIL : un téléphone peut changer
    // de main, et c'est le JETON qui est unique en base. Le réenregistrer le
    // déplace au lieu d'envoyer au suivant les avis du précédent.
    //
    // 🔴 `app: 'logistic'`, ET C'EST TOUT LE ROUTAGE. Le serveur ne pousse à cet
    // appareil que les avis adressés à H2H Logistic.
    const { error } = await supabase.from('device_tokens').upsert(
      {
        profile_id: profileId,
        expo_push_token: jeton,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
        app: 'logistic',
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'expo_push_token' },
    );
    if (error) {
      console.warn('[push] enregistrement refuse :', error.message);
      return null;
    }
    return jeton;
  } catch (e) {
    console.warn('[push] indisponible ici :', (e as Error).message);
    return null;
  }
}

/**
 * Oublie ce téléphone. Appelé à la déconnexion, AVANT de fermer la session :
 * la suppression passe par la policy du propriétaire, qui exige d'être connecté.
 *
 * 🔴 SANS ÇA, LE TÉLÉPHONE CONTINUE DE RECEVOIR LES PROPOSITIONS DU COMPTE
 * PRÉCÉDENT — et un tap ouvrirait une proposition que le compte suivant ne peut
 * pas lire.
 */
export async function oublierAppareil(): Promise<void> {
  const N = notifications();
  if (!N) return;
  try {
    const projet = idProjet();
    if (!projet) return;
    const { data: jeton } = await N.getExpoPushTokenAsync({ projectId: projet });
    if (!jeton) return;
    await supabase.from('device_tokens').delete().eq('expo_push_token', jeton);
  } catch {
    // Rien à oublier : ni permission, ni jeton. La déconnexion continue.
  }
}

/** Les taps déjà suivis, pour toute la vie du processus. */
const tapsSuivis = new Set<string>();

/**
 * Branche le tap sur une notification à la navigation.
 *
 * ⚠️ DEUX CHEMINS. `addNotificationResponseReceivedListener` ne couvre que
 * l'application déjà lancée ; quand le tap la démarre, l'événement est passé
 * avant que l'écouteur se pose — d'où `getLastNotificationResponseAsync`.
 */
export function ecouterTapsNotification(aller: (route: string) => void): () => void {
  const N = notifications();
  if (!N) return () => {};
  const ouvrir = (reponse: import('expo-notifications').NotificationResponse | null) => {
    // ⚠️ UN TAP NE S'OUVRE QU'UNE FOIS. Au démarrage à froid, les deux chemins
    // peuvent rapporter le même tap, et `getLastNotificationResponseAsync` le rend
    // encore à chaque nouvel appel : sans ce registre, l'écran s'empilerait deux fois.
    const id = reponse?.notification?.request?.identifier;
    if (!id || tapsSuivis.has(id)) return;
    tapsSuivis.add(id);
    const route = routeSuivable(
      (reponse?.notification?.request?.content?.data as { route?: unknown } | undefined)?.route,
    );
    if (route) aller(route);
  };
  void N.getLastNotificationResponseAsync().then(ouvrir).catch(() => {});
  const abonnement = N.addNotificationResponseReceivedListener(ouvrir);
  return () => abonnement.remove();
}

/**
 * Prévient quand un avis arrive application ouverte — pour relire tout de suite
 * au lieu d'attendre la relecture de fond (trente secondes sur vingt minutes).
 */
export function ecouterReceptions(relire: () => void): () => void {
  const N = notifications();
  if (!N) return () => {};
  const abonnement = N.addNotificationReceivedListener(() => relire());
  return () => abonnement.remove();
}
