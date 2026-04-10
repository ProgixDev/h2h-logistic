import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import type { Mission, MissionStatus } from '@/types/mission';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';
import { formatCurrency, formatTime } from '@/utils/formatting';

const STATUS_LABELS: Record<string, string> = {
  proposal: 'Proposition',
  accepted: 'Acceptée',
  seller_pending: 'Attente vendeur',
  group_created: 'Groupe créé',
  pickup_pending: 'Collecte',
  picked_up: 'Collecté',
  in_transit: 'En transit',
  delivery_pending: 'Livraison',
  delivered: 'Livré',
  completed: 'Terminé',
  cancelled: 'Annulée',
  expired: 'Expirée',
};

const NEXT_ACTION: Partial<Record<MissionStatus, { label: string; iconName: IconName }>> = {
  pickup_pending: { label: 'Scanner le QR', iconName: 'camera' },
  picked_up: { label: 'En route', iconName: 'rocket' },
  in_transit: { label: 'En route', iconName: 'rocket' },
  delivery_pending: { label: 'Entrer le code', iconName: 'keypad' },
  seller_pending: { label: 'En attente', iconName: 'hourglass' },
  group_created: { label: 'Prêt', iconName: 'checkmark-circle' },
};

const SIZE_ICON_NAMES: Record<string, IconName> = {
  XS: 'envelope', S: 'package', M: 'package', L: 'package', XL: 'package',
};

interface MissionCardProps {
  mission: Mission;
}

export function MissionCard({ mission }: MissionCardProps) {
  const { colors } = useColorScheme();
  const router = useRouter();

  const getStatusVariant = () => {
    switch (mission.status) {
      case 'delivered':
      case 'completed':
        return 'success' as const;
      case 'cancelled':
      case 'expired':
        return 'error' as const;
      case 'proposal':
      case 'seller_pending':
        return 'warning' as const;
      default:
        return 'default' as const;
    }
  };

  const nextAction = NEXT_ACTION[mission.status];

  return (
    <TouchableOpacity onPress={() => router.push(`/mission/${mission.id}`)} activeOpacity={0.8}>
      <Card>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.route, { color: colors.text }]}>
            {mission.pickupHub.city} → {mission.deliveryHub.city}
          </Text>
          <Badge
            label={STATUS_LABELS[mission.status] ?? mission.status}
            variant={getStatusVariant()}
          />
        </View>

        {/* Hubs */}
        <Text style={[styles.hubs, { color: colors.textSecondary }]} numberOfLines={1}>
          {mission.pickupHub.name} → {mission.deliveryHub.name}
        </Text>

        {/* Package */}
        <View style={styles.packageRow}>
          <Icon name={SIZE_ICON_NAMES[mission.package.size] ?? 'package'} size={14} color={colors.textSecondary} />
          <Text style={[styles.packageText, { color: colors.textSecondary }]}>
            {mission.package.description} — {mission.package.size}, {mission.package.weight} kg
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            <Text style={[styles.time, { color: colors.textSecondary }]}>
              {formatTime(mission.pickupHub.scheduledTime)} → {formatTime(mission.deliveryHub.scheduledTime)}
            </Text>
            {nextAction && (
              <View style={styles.actionRow}>
                <Icon name={nextAction.iconName} size={12} color={colors.primary} />
                <Text style={[styles.actionLabel, { color: colors.primary }]}>{nextAction.label}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.earning, { color: colors.success }]}>
            {formatCurrency(mission.transporterEarning)}
          </Text>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  route: {
    ...Typography.h3,
  },
  hubs: {
    ...Typography.caption,
    marginBottom: Spacing.sm,
  },
  packageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  sizeIcon: {
    width: 14,
  },
  packageText: {
    ...Typography.caption,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  footerLeft: {
    gap: Spacing.xs,
  },
  time: {
    ...Typography.caption,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionIcon: {
    width: 12,
  },
  actionLabel: {
    ...Typography.captionMedium,
  },
  earning: {
    ...Typography.bodyMedium,
  },
});
