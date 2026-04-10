import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Hub } from '@/types/hub';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';
import { HUB_TYPE_ICON_NAMES, HUB_TYPE_LABELS } from '@/services/mock/hubs';

interface HubCardProps {
  hub: Hub;
  selected?: boolean;
  onPress?: (hub: Hub) => void;
  distance?: string;
}

export function HubCard({ hub, selected, onPress, distance }: HubCardProps) {
  const { colors } = useColorScheme();

  const typeLabel = HUB_TYPE_LABELS[hub.type] ?? hub.type;
  const typeIconName = HUB_TYPE_ICON_NAMES[hub.type] ?? 'location-filled';

  return (
    <TouchableOpacity onPress={() => onPress?.(hub)} activeOpacity={0.7}>
      <Card
        style={selected ? { borderColor: colors.primary, borderWidth: 2 } : undefined}
      >
        <View style={styles.header}>
          <Text style={[styles.name, { color: colors.text }]}>{hub.name}</Text>
          <Badge label={typeLabel} variant="outline" />
        </View>
        <Text style={[styles.address, { color: colors.textSecondary }]}>
          {hub.address}, {hub.city}
        </Text>
        <View style={styles.footer}>
          <Text style={[styles.hours, { color: colors.textSecondary }]}>
            {hub.openingHours}
          </Text>
          {distance && (
            <Text style={[styles.distance, { color: colors.primary }]}>{distance}</Text>
          )}
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
  name: {
    ...Typography.bodyMedium,
    flex: 1,
    marginRight: Spacing.sm,
  },
  address: {
    ...Typography.caption,
    marginBottom: Spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  hours: {
    ...Typography.caption,
  },
  distance: {
    ...Typography.captionMedium,
  },
});
