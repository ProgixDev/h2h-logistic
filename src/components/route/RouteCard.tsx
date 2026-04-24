import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import type { PublishedRoute } from '@/types/route';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { TRANSPORT_TYPES } from '@/constants/TransportTypes';
import { Typography } from '@/constants/Typography';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useRouteStore } from '@/stores/useRouteStore';

const DAYS_SHORT: Record<number, string> = { 1: 'Lun', 2: 'Mar', 3: 'Mer', 4: 'Jeu', 5: 'Ven', 6: 'Sam', 7: 'Dim' };

interface RouteCardProps {
  route: PublishedRoute;
}

export function RouteCard({ route }: RouteCardProps) {
  const { colors } = useColorScheme();
  const router = useRouter();
  const { toggleRouteStatus, deleteRoute, hasActiveMission } = useRouteStore();
  const [showMenu, setShowMenu] = useState(false);

  const transport = TRANSPORT_TYPES.find((t) => t.id === route.transportType);
  const isActive = route.status === 'active';
  const hasMission = hasActiveMission(route.id);

  // Schedule text
  const scheduleText = (() => {
    if (route.type === 'recurring' && route.schedule.recurringDays?.length) {
      const days = route.schedule.recurringDays.sort((a, b) => a - b);
      const isWeekdays = days.length === 5 && [1, 2, 3, 4, 5].every((d) => days.includes(d));
      const dayLabel = isWeekdays ? 'Lun-Ven' : days.map((d) => DAYS_SHORT[d]).join(', ');
      const deliveryTime = Object.values(route.schedule.deliveryTimes)[0] ?? '';
      return `${dayLabel}, ${route.schedule.pickupTime} → ${deliveryTime}`;
    }
    const deliveryTime = Object.values(route.schedule.deliveryTimes)[0] ?? '';
    return `Ponctuel — ${route.schedule.pickupTime} → ${deliveryTime}`;
  })();

  // Multi-hub text
  const deliveryHubsText = route.deliveryHubs.length === 1
    ? route.deliveryHubs[0].hubName
    : route.deliveryHubs.map((h) => h.hubName).join(', ');

  const handleLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      route.departureCity + ' → ' + route.arrivalCity,
      undefined,
      [
        { text: 'Modifier', onPress: () => router.push({ pathname: '/route/edit', params: { id: route.id } }) },
        {
          text: isActive ? 'Mettre hors ligne' : 'Activer',
          onPress: () => {
            if (hasMission && isActive) {
              Alert.alert('Livraison en cours', 'Ce trajet a une livraison active. Il restera visible jusqu\'à la fin de la livraison.');
            }
            toggleRouteStatus(route.id);
          },
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            if (hasMission) {
              Alert.alert('Impossible', 'Ce trajet a une livraison en cours. Terminez la livraison avant de supprimer.');
              return;
            }
            Alert.alert('Supprimer ce trajet ?', 'Cette action est irréversible.', [
              { text: 'Annuler', style: 'cancel' },
              { text: 'Supprimer', style: 'destructive', onPress: () => deleteRoute(route.id) },
            ]);
          },
        },
        { text: 'Annuler', style: 'cancel' },
      ],
    );
  };

  return (
    <TouchableOpacity
      onPress={() => router.push(`/route/${route.id}`)}
      onLongPress={handleLongPress}
      activeOpacity={0.8}
    >
      <Card>
        {/* Status + route */}
        <View style={styles.topRow}>
          <View style={styles.routeRow}>
            <View style={[styles.statusDot, { backgroundColor: isActive ? colors.online : colors.offline }]} />
            <Text style={[styles.cities, { color: colors.text }]}>
              {route.departureCity} → {route.arrivalCity}
            </Text>
          </View>
          <Badge label={isActive ? 'Actif' : 'Hors ligne'} variant={isActive ? 'success' : 'default'} />
        </View>

        {/* Hubs */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginBottom: Spacing.sm }}>
          <Icon name="location-filled" size={14} color={colors.textSecondary} />
          <Text style={[styles.hubs, { color: colors.textSecondary }]} numberOfLines={2}>
            {route.pickupHub.hubName} → {deliveryHubsText}
          </Text>
        </View>

        {/* Transport + Schedule */}
        <View style={styles.metaRow}>
          <View style={styles.transportRow}>
            <Icon name={transport?.iconName ?? 'package'} size={16} color={colors.textSecondary} />
            <Text style={[styles.transportLabel, { color: colors.textSecondary }]}>{transport?.label}</Text>
          </View>
          <Text style={[styles.schedule, { color: colors.textSecondary }]}>{scheduleText}</Text>
        </View>

        {/* Capacity + Missions */}
        <View style={styles.bottomRow}>
          <Text style={[styles.capacity, { color: colors.textSecondary }]}>
            {route.maxPackages} colis, taille {route.maxSize} max
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Icon name="package" size={14} color={colors.primary} />
            <Text style={[styles.missions, { color: colors.primary }]}>
              {route.missionsCount} livraisons
            </Text>
          </View>
        </View>

        {/* Active mission warning */}
        {hasMission && (
          <View style={[styles.missionBanner, { backgroundColor: colors.warning + '12' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Icon name="alert-circle" size={14} color={colors.warning} />
              <Text style={[styles.missionBannerText, { color: colors.warning }]}>
                Livraison en cours
              </Text>
            </View>
          </View>
        )}
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  cities: { ...Typography.h3 },
  hubs: { ...Typography.caption, lineHeight: 18, flex: 1 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  transportRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  transportIcon: { fontSize: 16 },
  transportLabel: { ...Typography.caption },
  schedule: { ...Typography.caption },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  capacity: { ...Typography.caption },
  missions: { ...Typography.captionMedium },
  missionBanner: { marginTop: Spacing.sm, paddingVertical: Spacing.xs, paddingHorizontal: Spacing.sm, borderRadius: BorderRadius.sm, alignSelf: 'flex-start' },
  missionBannerText: { ...Typography.caption, fontWeight: '600' },
});
