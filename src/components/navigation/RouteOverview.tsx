import React from 'react';
import { View, Text, TouchableOpacity, Linking, Platform, StyleSheet } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/constants/Typography';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';
import { formatRouteDistance, formatRouteDuration, getETA, type RouteResult } from '@/services/routing';

interface RouteOverviewProps {
  route: RouteResult;
  originName: string;
  destinationName: string;
  destinationCoords?: { lat: number; lng: number };
  onStart: () => void;
  onCancel: () => void;
}

export function RouteOverview({
  route,
  originName,
  destinationName,
  destinationCoords,
  onStart,
  onCancel,
}: RouteOverviewProps) {
  const openInMaps = () => {
    if (!destinationCoords) return;
    const { lat, lng } = destinationCoords;
    const url = Platform.OS === 'ios'
      ? `maps://?daddr=${lat},${lng}`
      : `google.navigation:q=${lat},${lng}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
    });
  };
  const { colors } = useColorScheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Route summary */}
      <View style={styles.summaryRow}>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.primary }]}>
            {formatRouteDuration(route.duration)}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Durée</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {formatRouteDistance(route.distance)}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Distance</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.success }]}>
            {getETA(route.duration)}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Arrivée</Text>
        </View>
      </View>

      {/* Origin → Destination */}
      <View style={styles.routeRow}>
        <View style={styles.routeDots}>
          <View style={[styles.routeDot, { backgroundColor: colors.primary }]} />
          <View style={[styles.routeLine, { backgroundColor: colors.border }]} />
          <View style={[styles.routeDot, { backgroundColor: colors.success }]} />
        </View>
        <View style={styles.routeNames}>
          <Text style={[styles.routeName, { color: colors.text }]} numberOfLines={1}>
            {originName}
          </Text>
          <Text style={[styles.routeName, { color: colors.text }]} numberOfLines={1}>
            {destinationName}
          </Text>
        </View>
      </View>

      {/* Steps count */}
      <Text style={[styles.stepsCount, { color: colors.textSecondary }]}>
        {route.steps.length} étapes sur cet itinéraire
      </Text>

      {/* Actions */}
      <View style={styles.actions}>
        <Button title="Démarrer la navigation" onPress={onStart} variant="gradient" />
        {destinationCoords && (
          <TouchableOpacity onPress={openInMaps} style={styles.mapsLink} accessibilityLabel="Ouvrir dans l'application de cartes">
            <Text style={[styles.mapsLinkText, { color: colors.primary }]}>Ouvrir dans Maps</Text>
          </TouchableOpacity>
        )}
        <Button title="Annuler" onPress={onCancel} variant="outline" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
    gap: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 20,
    lineHeight: 26,
  },
  statLabel: {
    ...Typography.caption,
  },
  divider: {
    width: 1,
    height: 32,
  },
  routeRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  routeDots: {
    alignItems: 'center',
    width: 16,
    paddingVertical: 4,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  routeLine: {
    flex: 1,
    width: 2,
    marginVertical: 2,
  },
  routeNames: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  routeName: {
    ...Typography.bodyMedium,
  },
  stepsCount: {
    ...Typography.caption,
    textAlign: 'center',
  },
  actions: {
    gap: Spacing.md,
    alignItems: 'center',
  },
  mapsLink: {
    paddingVertical: Spacing.sm,
  },
  mapsLinkText: {
    ...Typography.captionMedium,
    textDecorationLine: 'underline',
  },
});
