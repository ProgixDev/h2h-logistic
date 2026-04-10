import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { RouteHub } from '@/types/route';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';

interface RouteTimelineProps {
  pickupHub: RouteHub;
  deliveryHubs: RouteHub[];
}

export function RouteTimeline({ pickupHub, deliveryHubs }: RouteTimelineProps) {
  const { colors } = useColorScheme();
  const allHubs = [pickupHub, ...deliveryHubs];

  return (
    <View style={styles.container}>
      {allHubs.map((hub, index) => {
        const isFirst = index === 0;
        const isLast = index === allHubs.length - 1;

        return (
          <View key={hub.hubId} style={styles.hubRow}>
            <View style={styles.dotColumn}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: isFirst ? colors.primary : colors.primaryGradientEnd,
                  },
                ]}
              />
              {!isLast && (
                <View style={[styles.line, { backgroundColor: colors.border }]} />
              )}
            </View>
            <View style={styles.hubInfo}>
              <Text style={[styles.hubName, { color: colors.text }]}>{hub.hubName}</Text>
              <Text style={[styles.hubCity, { color: colors.textSecondary }]}>
                {hub.city} — {hub.arrivalTime}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingLeft: Spacing.sm,
  },
  hubRow: {
    flexDirection: 'row',
    minHeight: 56,
  },
  dotColumn: {
    alignItems: 'center',
    width: 24,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  line: {
    width: 2,
    flex: 1,
    marginVertical: 2,
  },
  hubInfo: {
    flex: 1,
    paddingLeft: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  hubName: {
    ...Typography.bodyMedium,
  },
  hubCity: {
    ...Typography.caption,
    marginTop: 2,
  },
});
