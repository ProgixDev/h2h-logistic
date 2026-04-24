import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { Icon } from '@/components/ui/Icon';
import { Typography } from '@/constants/Typography';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';
import type { MissionParticipant } from '@/types/mission';

interface ActivePartyCardProps {
  party: MissionParticipant;
  contextLabel: string;
  phase: string;
  onPress: () => void;
}

export function ActivePartyCard({ party, contextLabel, phase, onPress }: ActivePartyCardProps) {
  const { colors } = useColorScheme();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${contextLabel} ${party.name}. ${phase}. Ouvrir la discussion.`}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          shadowColor: '#000',
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      {/* Left: avatar */}
      <View style={styles.avatarWrap}>
        {party.avatar ? (
          <Image
            source={{ uri: party.avatar }}
            style={styles.avatar}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={[styles.avatarFallback, { backgroundColor: colors.accentLight }]}>
            <Text style={[styles.avatarInitial, { color: colors.primary }]}>
              {party.name[0]?.toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      {/* Center: text */}
      <View style={styles.textCol}>
        <Text style={[styles.context, { color: colors.textSecondary }]}>{contextLabel}</Text>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {party.name}
        </Text>
        <Text style={[styles.phase, { color: colors.textSecondary }]} numberOfLines={1}>
          {phase}
        </Text>
      </View>

      {/* Trailing: chevron + chat */}
      <View style={styles.trailing}>
        <Icon name="chat" size={20} color={colors.primary} />
        <Icon name="chevron-right" size={18} color={colors.textSecondary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 96,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarWrap: {
    width: 80,
    height: 80,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarFallback: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 30,
    lineHeight: 36,
  },
  textCol: {
    flex: 1,
    paddingVertical: 12,
    gap: 2,
    justifyContent: 'center',
  },
  context: {
    ...Typography.caption,
  },
  name: {
    ...Typography.h3,
  },
  phase: {
    ...Typography.caption,
  },
  trailing: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
});
