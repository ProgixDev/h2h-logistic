import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Stack, useRouter } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { ClerkProvider, useClerk } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import { useColorScheme } from '@/hooks/useColorScheme';
import { setClerk } from '@/lib/clerkBridge';
import { useAuthStore } from '@/stores/useAuthStore';
import { useCandidaturesStore } from '@/stores/useCandidaturesStore';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { ecouterReceptions, ecouterTapsNotification, enregistrerAppareil } from '@/services/push';
import {
  clesDeTest,
  clesLive,
  messageClesDeTest,
  messageClesLive,
  type CleNommee,
} from '@/utils/clesDeProduction';
import { LogBox } from 'react-native';

// ⚠️ CE BANDEAU JAUNE RECOUVRE LE BAS DE TOUS LES ÉCRANS, DONC LES BOUTONS.
//
// Clerk avertit à chaque démarrage que l'instance est en clés de test. C'est
// exactement ce qu'on veut en développement (cf. le garde-fou ci-dessous, qui
// REFUSE les clés de test en production) : l'avertissement ne nous apprend
// rien et ne partira jamais. Or la notification LogBox se pose en bas de
// l'écran et avale les touches : « Continuer » de la connexion, les onglets,
// « Je prends ce colis » — plus rien n'est cliquable sur un appareil piloté en
// test. On tait donc CE message précis, et lui seul : tout autre avertissement
// doit continuer à se voir.
if (__DEV__) {
  LogBox.ignoreLogs(['Clerk has been loaded with development keys']);
}

SplashScreen.preventAutoHideAsync();

// 🔴 LA MÊME INSTANCE CLERK QUE LA PLACE DE MARCHÉ, ET CE N'EST PAS NÉGOCIABLE.
// `app.uid()` traduit le `sub` du jeton en `profiles.auth_user_id`. Une seconde
// application Clerk frapperait des sujets d'un autre espace : `app.uid()`
// rendrait NULL et TOUTES les policies échoueraient — en silence, sans message
// d'erreur, avec des écrans simplement vides.
const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';

if (!publishableKey) {
  throw new Error(
    'EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY manquante. Reprendre la MÊME valeur que ' +
      'hand-to-hand/.env.local — les deux applications partagent une seule ' +
      'instance Clerk, sinon app.uid() ne resout plus personne.',
  );
}

// ⚠️ LE GARDE DANS LES DEUX SENS. Une build de production avec des clés de test
// authentifie contre l'instance de développement ; une build de développement
// avec des clés live fait l'inverse — et ici la seconde est la plus grave : un
// cotransporteur particulier d'essai se verrait proposer de VRAIS colis, avec
// l'adresse de vraies personnes.
const clesEmbarquees: CleNommee[] = [['Clerk', publishableKey]];

if (!__DEV__) {
  const enTest = clesDeTest(clesEmbarquees);
  if (enTest.length) throw new Error(messageClesDeTest(enTest));
} else if (process.env.EXPO_PUBLIC_AUTORISER_CLES_LIVE_EN_DEV !== '1') {
  const enLive = clesLive(clesEmbarquees);
  if (enLive.length) throw new Error(messageClesLive(enLive));
}

/**
 * Sort l'instance Clerk de React pour que le store zustand puisse s'en servir.
 *
 * ⚠️ MONTÉ SOUS LE `ClerkProvider` — c'est la seule position où `useClerk()`
 * répond. Ne rend rien : il n'existe que pour ce branchement.
 *
 * ⚠️ ET IL REPREND LA SESSION. Clerk garde la session dans le trousseau, mais
 * zustand redémarre vide : sans cette reprise, l'application se croirait
 * déconnectée à chaque lancement alors que la session est valide. On attend
 * `loaded` — avant, `clerk.session` est encore nul et on conclurait à tort que
 * personne n'est connecté.
 */
function PontClerk() {
  const clerk = useClerk();
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    setClerk(clerk);
    return () => setClerk(null);
  }, [clerk]);

  useEffect(() => {
    if (clerk?.loaded) void hydrate();
  }, [clerk?.loaded, clerk?.session?.id, hydrate]);

  return null;
}

/**
 * Inscrit le téléphone au push une fois quelqu'un connecté, et suit les taps.
 *
 * 🔴 UN TAP PEUT DÉMARRER L'APPLICATION À FROID, AVANT LA REPRISE DE SESSION.
 * Ouvrir la proposition à cet instant la ferait lire sans identité ; on garde
 * donc la route, et on la suit dès que le profil est relu. L'écran d'accueil
 * (`index`) reste dessous : sa redirection ne joue qu'une fois revenu au premier
 * plan, c'est-à-dire au retour de la proposition.
 *
 * ⚠️ L'ÉCOUTE NE DÉPEND PAS DE LA CONNEXION : attendre le profil pour la poser
 * ferait manquer l'événement qui a lancé le processus.
 */
function PontNotifications() {
  const router = useRouter();
  const profilId = useAuthStore((s) => s.user?.id ?? null);
  const enAttente = useRef<string | null>(null);

  useEffect(() => {
    if (!profilId) return;
    void enregistrerAppareil(profilId);
    const route = enAttente.current;
    enAttente.current = null;
    if (route) router.push(route as never);
  }, [profilId, router]);

  useEffect(
    () =>
      ecouterTapsNotification((route) => {
        if (useAuthStore.getState().user) router.push(route as never);
        else enAttente.current = route;
      }),
    [router],
  );

  // Un avis reçu application ouverte : relire tout de suite.
  useEffect(
    () =>
      ecouterReceptions(() => {
        if (!useAuthStore.getState().user) return;
        void useCandidaturesStore.getState().charger();
        void useNotificationStore.getState().charger();
      }),
    [],
  );

  return null;
}

export default function RootLayout() {
  const { isDark, colors } = useColorScheme();

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <PontClerk />
      <PontNotifications />
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
              animation: 'slide_from_right',
            }}
          >
            {/* 🔴 CET `index` DOIT ÊTRE DÉCLARÉ, ET EN PREMIER. Quand un `Stack`
                déclare des écrans explicitement, expo-router prend LE PREMIER
                comme route d'ancrage. Ici les trois seuls déclarés étaient
                `publish`, `navigate` et `call` : l'application démarrait donc
                sur « Publier un trajet », étape 1/8.
                ⚠️ ET TOUTE LA CHAÎNE D'ACCÈS ÉTAIT CONTOURNÉE. `index.tsx`
                enchaîne onboarding → connexion → complete-profile → convention
                → pending-validation → onglets. Rien de tout cela ne s'exécutait :
                un inconnu, jamais inscrit, jamais validé, arrivait directement
                dans le formulaire de publication d'un trajet. Constaté à
                l'émulateur le 02/09/2026, au premier lancement de l'application.
                La place de marché, elle, déclare `index` en premier — c'est la
                seule différence entre les deux, et elle décidait de tout. */}
            <Stack.Screen name="index" />
            <Stack.Screen name="publish" options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="navigate" options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
            <Stack.Screen name="call" options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
          </Stack>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ClerkProvider>
  );
}
