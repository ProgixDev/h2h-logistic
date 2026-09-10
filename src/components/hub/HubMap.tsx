// LE POINT ÉPINGLÉ — ce que le protocole de nommage exige, et qui manquait.
//
// 🔴 « LE POINT EXACT DOIT ÊTRE ÉPINGLÉ. LE NOM DU HUB NE SUFFIT PAS. Le lieu
// doit rester visible, routier, trouvable et défendable en cas de litige. »
// (docs/hubs-protocole-nommage.md, « Affichage recommandé »). Jusqu'ici cette
// application n'avait qu'un SCHÉMA SVG — un cercle et deux points, sans aucune
// cartographie. Et il était centré sur (0, 0), parce que le service rendait
// `latitude: 0, longitude: 0` pour tous les hubs.
//
// ⚠️ `expo-maps` ÉTAIT DÉJÀ UNE DÉPENDANCE, installée et importée nulle part —
// absente aussi des `plugins` d'`app.json`, donc le module natif n'était même
// pas lié. Le commentaire de `HubZoneMap` disait « react-native-maps n'est pas
// installé dans cette application » : c'était vrai, et hors sujet depuis le jour
// où `expo-maps` est arrivé.
//
// 🔴 CE COMPOSANT NE REND JAMAIS LA POSITION DE L'AUTRE PARTIE DE SON PROPRE
// CHEF. `autre` n'est passé que lorsque `presence_au_hub()` l'a rendue, c'est-à-
// dire après la double déclaration ET la double présence dans la zone. Un
// composant qui irait la chercher lui-même contournerait la règle du §4.
//
// 🔴 07/09/2026 — CE COMPOSANT N'ÉTAIT RENDU NULLE PART, et un import statique
// d'`expo-maps` l'aurait rendu inrendable de toute façon. `expo-maps` appelle
// `requireNativeModule('ExpoMaps')` et `requireNativeView('ExpoGoogleMaps')` AU
// CHARGEMENT DU MODULE, pas au rendu : sans le module natif, l'import LÈVE et
// c'est l'écran entier qui blanchit, pas la carte qui manque.
//
// ⚠️ ET LE MODULE NATIF MANQUE DANS DEUX CAS ORDINAIRES : Expo Go — que le
// script `start` de ce dépôt lance encore (`expo start --go`) — et tout build
// de développement antérieur à l'ajout du plugin dans `app.json`. Le `.apk`
// installé au 07/09/2026 ne portait que `libexpo-modules-core.so` : le plugin
// est déclaré, mais aucun build ne l'avait encore compilé.
//
// ⚠️ D'OÙ LE CHARGEMENT TOLÉRANT CI-DESSOUS. `HubZoneMap` redevient ce que son
// propre commentaire annonçait — « the graceful fallback […] so it can be
// swapped for a MapView […] without changing callers ». Il n'est pas supprimé :
// il est ce qui s'affiche quand la carte native n'est pas là.
//
// ⚠️ ASYMÉTRIE AVEC LA PLACE DE MARCHÉ, ET ELLE EST NORMALE : son `HubMap` tient
// sur `react-native-maps`, qui est lié dans son build. Seule cette application-ci
// a besoin de la garde, parce que seule elle dépend d'`expo-maps`.
import React from 'react';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { useImage } from 'expo-image';
import type { Hub } from '@/types/hub';
import { HubZoneMap } from '@/components/logistics/HubZoneMap';
import { Typography } from '@/constants/Typography';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useTranslation } from '@/hooks/useTranslation';

type ModuleCartes = typeof import('expo-maps');

/**
 * `null` dès que le module natif n'est pas lié — Expo Go, ou build antérieur.
 * Exporté : `HubsMap` (plusieurs hubs à choisir) passe par la même garde.
 */
export const CARTES: ModuleCartes | null = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-maps') as ModuleCartes;
  } catch {
    return null;
  }
})();

export type HubMapProps = {
  hub: Hub;
  /** Ma position, une fois connue. Toujours autorisée. */
  moi?: { lat: number; lng: number } | null;
  /** 🔴 La position de l'AUTRE — UNIQUEMENT quand le serveur l'a rendue. */
  autre?: { lat: number; lng: number } | null;
  /** Repris tel quel par le schéma de repli, qui colore le point selon la zone. */
  dansLaZone?: boolean;
  hauteur?: number;
};

export function HubMap({ hub, moi, autre, dansLaZone = false, hauteur = 200 }: HubMapProps) {
  const { colors } = useColorScheme();
  const { t } = useTranslation();
  // 🔴 LE HUB ET MOI PORTAIENT LA MÊME ÉPINGLE ROUGE (vu à l'émulateur le
  // 10/09/2026) : deux épingles identiques à 20 m l'une de l'autre, et rien pour
  // dire laquelle est le point de rendez-vous. Le hub garde l'épingle — c'est le
  // lieu — et les personnes deviennent des POINTS, vert pour moi, orange pour
  // l'autre : les couleurs de la place de marché, et du schéma de repli.
  //
  // ⚠️ SUR ANDROID, UNE IMAGE EST LE SEUL MOYEN : le marqueur Google d'`expo-maps`
  // n'a pas de couleur, seulement `icon`. Sur iOS, `tintColor` suffit.
  const pointMoi = useImage(require('../../../assets/images/carte/point-moi.png'));
  const pointAutre = useImage(require('../../../assets/images/carte/point-autre.png'));

  // ⚠️ APRÈS LES HOOKS. `CARTES` est constant pour la durée du programme, donc
  // la branche ne change jamais d'un rendu à l'autre — mais placer un retour
  // au-dessus d'un hook reste la faute que ce dépôt a déjà corrigée une fois.
  if (!CARTES) {
    return (
      <HubZoneMap
        hub={hub}
        userCoords={moi ? { latitude: moi.lat, longitude: moi.lng } : null}
        inZone={dansLaZone}
      />
    );
  }

  const { AppleMaps, GoogleMaps } = CARTES;
  const centre = { latitude: hub.point.lat, longitude: hub.point.lng };

  // ⚠️ LE ZOOM SUIT LE RAYON : un hub à 200 m et un hub à 20 m ne se regardent
  // pas de la même hauteur. Sans ça, la zone d'un grand parking sortirait du
  // cadre et celle d'un rond-point serait un point.
  const zoom = hub.zoneRadiusM > 150 ? 16 : hub.zoneRadiusM > 80 ? 17 : 18;

  const ios = Platform.OS === 'ios';
  // Un point se pose par son CENTRE, pas par sa pointe comme une épingle.
  const personne = (
    id: string,
    p: { lat: number; lng: number },
    titre: string,
    image: ReturnType<typeof useImage>,
    teinte: string,
  ) => ({
    id,
    coordinates: { latitude: p.lat, longitude: p.lng },
    title: titre,
    zIndex: 2,
    ...(ios
      ? { systemImage: 'circle.fill', tintColor: teinte }
      : image ? { icon: image, anchor: { x: 0.5, y: 0.5 } } : {}),
  });

  const marqueurs = [
    { id: 'hub', coordinates: centre, title: hub.name, snippet: hub.displayDetail, zIndex: 1 },
    ...(moi ? [personne('moi', moi, t('zone.you'), pointMoi, colors.success)] : []),
    ...(autre ? [personne('autre', autre, t('zone.other'), pointAutre, colors.warning)] : []),
  ];

  const cercles = [
    {
      center: centre,
      radius: hub.zoneRadiusM,
      color: `${colors.primary}22`,
      lineColor: colors.primary,
      lineWidth: 2,
    },
  ];

  const camera = { coordinates: centre, zoom };

  return (
    <View style={[styles.cadre, { height: hauteur, borderColor: colors.border }]}>
      {ios ? (
        <AppleMaps.View
          style={StyleSheet.absoluteFill}
          cameraPosition={camera}
          markers={marqueurs as any}
          circles={cercles as any}
        />
      ) : (
        <GoogleMaps.View
          style={StyleSheet.absoluteFill}
          cameraPosition={camera}
          markers={marqueurs as any}
          circles={cercles as any}
        />
      )}

      {/* ⚠️ LE DÉTAIL AFFICHÉ RESTE SOUS LA CARTE, pas seulement dans la bulle du
          marqueur : le protocole demande les DEUX — « le point exact épinglé »
          ET « présentez-vous à l'endroit indiqué ». Une bulle qu'il faut ouvrir
          n'est pas un affichage. */}
      <View style={[styles.legende, { backgroundColor: `${colors.background}E6` }]}>
        <Text style={[styles.detail, { color: colors.text }]} numberOfLines={2}>
          {hub.displayDetail}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cadre: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  legende: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  detail: { ...Typography.caption },
});
