// PLUSIEURS POINTS DE RENDEZ-VOUS SUR UNE CARTE — pour en CHOISIR un.
//
// 🔴 L'ONGLET « CARTE » DE LA PUBLICATION ÉTAIT UN ÉCRITEAU DE DÉVELOPPEUR (vu à
// l'émulateur le 10/09/2026) : « Carte MapLibre — 12 hubs · Nécessite un
// development build », y compris SUR un development build. MapLibre n'a jamais
// été installé ; `expo-maps` l'était, et `HubMap` s'en sert déjà sur la page de
// présence. Cette carte-ci en reprend la garde, le chargement tolérant et les
// conventions.
//
// ⚠️ LE CHOIX SE FAIT D'UN APPUI SUR L'ÉPINGLE. `onMarkerClick` rend le marqueur
// touché ; son `id` est celui du hub. Le hub choisi reçoit son cercle de zone —
// sur Android, le marqueur Google n'a pas de couleur : le cercle est ce qui le
// distingue — et il passe au-dessus des autres.
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import type { Hub } from '@/types/hub';
import { CARTES } from '@/components/hub/HubMap';
import { BorderRadius } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';
import { cadrageDesHubs } from '@/utils/cadrageCarte';

export type HubsMapProps = {
  hubs: readonly Hub[];
  choisiId?: string | null;
  onChoisir: (hub: Hub) => void;
  hauteur?: number;
};

/** Vrai quand la carte native est disponible — sinon l'appelant garde sa liste. */
export const carteDisponible = CARTES != null;

export function HubsMap({ hubs, choisiId, onChoisir, hauteur = 320 }: HubsMapProps) {
  const { colors } = useColorScheme();
  if (!CARTES || hubs.length === 0) return null;

  const { AppleMaps, GoogleMaps } = CARTES;
  const ios = Platform.OS === 'ios';
  const cadrage = cadrageDesHubs(hubs.map((h) => h.point));

  const marqueurs = hubs.map((h) => {
    const choisi = h.id === choisiId;
    return {
      id: h.id,
      coordinates: { latitude: h.point.lat, longitude: h.point.lng },
      title: h.name,
      snippet: h.displayDetail,
      zIndex: choisi ? 2 : 1,
      ...(ios ? { tintColor: choisi ? colors.primary : colors.textSecondary } : {}),
    };
  });

  const choisi = hubs.find((h) => h.id === choisiId);
  const cercles = choisi
    ? [{
        center: { latitude: choisi.point.lat, longitude: choisi.point.lng },
        radius: choisi.zoneRadiusM,
        color: `${colors.primary}33`,
        lineColor: colors.primary,
        lineWidth: 2,
      }]
    : [];

  const toucher = (e: { id?: string } | undefined) => {
    const h = hubs.find((x) => x.id === e?.id);
    if (h) onChoisir(h);
  };

  const camera = { coordinates: { latitude: cadrage.lat, longitude: cadrage.lng }, zoom: cadrage.zoom };

  return (
    <View style={[styles.cadre, { height: hauteur, borderColor: colors.border }]}>
      {ios ? (
        <AppleMaps.View
          style={StyleSheet.absoluteFill}
          cameraPosition={camera}
          markers={marqueurs as any}
          circles={cercles as any}
          onMarkerClick={toucher as any}
        />
      ) : (
        <GoogleMaps.View
          style={StyleSheet.absoluteFill}
          cameraPosition={camera}
          markers={marqueurs as any}
          circles={cercles as any}
          onMarkerClick={toucher as any}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cadre: { borderRadius: BorderRadius.md, borderWidth: 1, overflow: 'hidden' },
});
