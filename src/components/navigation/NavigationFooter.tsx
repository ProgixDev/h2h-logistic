import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Icon } from '@/components/ui/Icon';
import { Typography } from '@/constants/Typography';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';
import { formatRouteDistance, formatRouteDuration, getETA } from '@/services/routing';

interface NavigationFooterProps {
  remainingDistance: number;  // meters
  remainingDuration: number;  // seconds
  hubName: string;
  onStop: () => void;
  voiceEnabled: boolean;
  onToggleVoice: () => void;
}

export function NavigationFooter({
  remainingDistance,
  remainingDuration,
  hubName,
  onStop,
  voiceEnabled,
  onToggleVoice,
}: NavigationFooterProps) {
  const { colors } = useColorScheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {formatRouteDuration(remainingDuration)}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Durée</Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {formatRouteDistance(remainingDistance)}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Distance</Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.primary }]}>
            {getETA(remainingDuration)}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Arrivée</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
        <Icon name="location-filled" size={14} color={colors.textSecondary} />
        <Text style={[styles.hubName, { color: colors.textSecondary }]} numberOfLines={1}>
          {hubName}
        </Text>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onToggleVoice();
          }}
          style={[styles.voiceBtn, { backgroundColor: voiceEnabled ? colors.primary + '15' : colors.border + '40' }]}
        >
          <Icon name={voiceEnabled ? 'volume-on' : 'volume-off'} size={20} color={voiceEnabled ? colors.primary : colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onStop();
          }}
          style={[styles.stopBtn, { backgroundColor: colors.error }]}
        >
          <Text style={styles.stopText}>Arrêter</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 34 : Spacing.lg,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    gap: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  statsRow: {
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
  hubName: {
    ...Typography.caption,
    textAlign: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'center',
  },
  voiceBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceIcon: {
    fontSize: 20,
  },
  stopBtn: {
    flex: 1,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
});
