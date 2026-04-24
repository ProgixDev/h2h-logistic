import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MapboxNavigationView } from '@badatgil/expo-mapbox-navigation';
import { Icon } from '@/components/ui/Icon';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';

export type MapboxNavigationProps = {
  origin: { latitude: number; longitude: number };
  destination: { latitude: number; longitude: number };
  voiceEnabled: boolean;
  onArrived: () => void;
  onCancel: () => void;
  onProgress?: (progress: {
    distanceRemaining: number;
    distanceTraveled: number;
    durationRemaining: number;
    fractionTraveled: number;
  }) => void;
  onOffRoute?: () => void;
  onReroute?: () => void;
};

/**
 * Real turn-by-turn navigation powered by Mapbox Navigation SDK v3.
 * Ships with lane guidance, speed-limit signs, junction views, traffic-aware
 * rerouting and French voice guidance — no custom UI to maintain.
 *
 * Requires tokens and a native rebuild; see README-MAPBOX.md.
 */
export function MapboxNavigation({
  origin,
  destination,
  voiceEnabled,
  onArrived,
  onCancel,
  onProgress,
  onOffRoute,
  onReroute,
}: MapboxNavigationProps) {
  const hasToken = !!process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;

  const coordinates = useMemo(
    () => [origin, destination],
    [origin.latitude, origin.longitude, destination.latitude, destination.longitude],
  );

  const handleProgress = useCallback(
    (event: any) => {
      if (!onProgress) return;
      const e = event?.nativeEvent ?? event;
      onProgress({
        distanceRemaining: e.distanceRemaining ?? 0,
        distanceTraveled: e.distanceTraveled ?? 0,
        durationRemaining: e.durationRemaining ?? 0,
        fractionTraveled: e.fractionTraveled ?? 0,
      });
    },
    [onProgress],
  );

  if (!hasToken) {
    return (
      <View style={styles.missingToken}>
        <Icon name="alert-circle" size={44} color="#F59E0B" />
        <Text style={styles.missingTitle}>Token Mapbox manquant</Text>
        <Text style={styles.missingBody}>
          Ajoutez EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN et MAPBOX_DOWNLOADS_TOKEN
          dans un fichier .env.local puis relancez `npx expo prebuild --clean`
          et `npx expo run:ios` (ou run:android).
        </Text>
      </View>
    );
  }

  return (
    <MapboxNavigationView
      style={StyleSheet.absoluteFill}
      coordinates={coordinates}
      locale="fr"
      mute={!voiceEnabled}
      routeProfile="mapbox/driving-traffic"
      onFinalDestinationArrival={onArrived}
      onCancelNavigation={onCancel}
      onUserOffRoute={onOffRoute}
      onRouteChanged={onReroute}
      onRouteProgressChanged={handleProgress}
    />
  );
}

const styles = StyleSheet.create({
  missingToken: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
    gap: Spacing.md,
    backgroundColor: '#1A1A1E',
  },
  missingTitle: {
    ...Typography.h3,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  missingBody: {
    ...Typography.body,
    color: '#E5E7EB',
    textAlign: 'center',
    lineHeight: 22,
  },
});
