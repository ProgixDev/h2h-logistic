import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { RouteHub } from '@/types/route';
import { HubParticipantChip, type HubParticipantInfo } from './HubParticipantChip';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';

interface RouteTimelineProps {
  pickupHub: RouteHub;
  deliveryHubs: RouteHub[];
  /** participants per hubId. May contain multiple buyers on same hub. */
  participantsByHubId?: Record<string, HubParticipantInfo[]>;
  dimmedHubIds?: string[];
  onPressParticipant?: (info: HubParticipantInfo) => void;
  onPressMore?: (extras: HubParticipantInfo[]) => void;
}

export function RouteTimeline({
  pickupHub,
  deliveryHubs,
  participantsByHubId = {},
  dimmedHubIds = [],
  onPressParticipant,
  onPressMore,
}: RouteTimelineProps) {
  const { colors } = useColorScheme();
  const allHubs = [pickupHub, ...deliveryHubs];

  return (
    <View style={styles.container}>
      {allHubs.map((hub, index) => {
        const isFirst = index === 0;
        const isLast = index === allHubs.length - 1;
        const dimmed = dimmedHubIds.includes(hub.hubId);
        const chipParticipants = participantsByHubId[hub.hubId] ?? [];

        return (
          <View key={hub.hubId} style={styles.hubRow}>
            <View style={styles.dotColumn}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: isFirst ? colors.primary : colors.primaryGradientEnd,
                    opacity: dimmed ? 0.4 : 1,
                  },
                ]}
              />
              {!isLast && (
                <View style={[styles.line, { backgroundColor: colors.border }]} />
              )}
            </View>
            <View style={[styles.hubInfo, dimmed && { opacity: 0.5 }]}>
              <Text style={[styles.hubName, { color: colors.text }]}>{hub.hubName}</Text>
              <Text style={[styles.hubCity, { color: colors.textSecondary }]}>
                {hub.city} — {hub.arrivalTime}
              </Text>
            </View>
            {chipParticipants.length > 0 && (
              <View style={styles.chipWrap}>
                <HubParticipantChip
                  participants={chipParticipants}
                  onPress={onPressParticipant}
                  onPressMore={onPressMore}
                />
              </View>
            )}
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
    alignItems: 'flex-start',
    minHeight: 56,
  },
  dotColumn: {
    alignItems: 'center',
    width: 24,
    paddingTop: 4,
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
  chipWrap: {
    paddingLeft: Spacing.sm,
    paddingTop: 2,
    flexShrink: 0,
  },
});
