import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import type { MissionParticipant } from '@/types/mission';
import { Typography } from '@/constants/Typography';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';

export interface HubParticipantInfo {
  participant: MissionParticipant;
  role: 'seller' | 'buyer';
}

interface HubParticipantChipProps {
  participants: HubParticipantInfo[]; // 1 expected, supports up to 2 stacked + "+N"
  onPress?: (info: HubParticipantInfo) => void;
  onPressMore?: (extras: HubParticipantInfo[]) => void;
  dimmed?: boolean;
}

export function HubParticipantChip({ participants, onPress, onPressMore, dimmed }: HubParticipantChipProps) {
  const { colors } = useColorScheme();

  if (participants.length === 0) return null;

  const primary = participants[0];
  const secondary = participants[1];
  const extra = participants.slice(2);
  const ringColor = primary.role === 'seller' ? colors.primary : colors.accent;
  const roleLabel = primary.role === 'seller' ? 'Vendeur' : 'Acheteur';

  const handlePress = () => {
    Haptics.selectionAsync();
    if (extra.length > 0 && onPressMore) {
      onPressMore(participants);
    } else {
      onPress?.(primary);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={
        extra.length > 0
          ? `${participants.length} participants à ce hub. Ouvrir la liste.`
          : `${roleLabel} ${primary.participant.name}. Ouvrir la discussion.`
      }
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <View style={styles.avatarStack}>
        <Avatar info={primary} ringColor={ringColor} size={28} />
        {secondary && (
          <View style={styles.avatarOverlap}>
            <Avatar
              info={secondary}
              ringColor={secondary.role === 'seller' ? colors.primary : colors.accent}
              size={28}
            />
          </View>
        )}
        {extra.length > 0 && (
          <View style={[styles.extraBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.extraText}>+{extra.length}</Text>
          </View>
        )}
      </View>

      <View style={[styles.text, dimmed ? null : null]}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {primary.participant.name.split(' ')[0]}
        </Text>
        <Text style={[styles.role, { color: colors.textSecondary }]}>{roleLabel}</Text>
      </View>
    </Pressable>
  );
}

function Avatar({ info, ringColor, size }: { info: HubParticipantInfo; ringColor: string; size: number }) {
  const { colors } = useColorScheme();
  const ringWidth = 2;
  const inner = size - ringWidth * 2;

  return (
    <View style={[avatarStyles.ring, { width: size, height: size, borderRadius: size / 2, borderColor: ringColor }]}>
      {info.participant.avatar ? (
        <Image
          source={{ uri: info.participant.avatar }}
          style={{ width: inner, height: inner, borderRadius: inner / 2 }}
          contentFit="cover"
        />
      ) : (
        <View style={[avatarStyles.fallback, { width: inner, height: inner, borderRadius: inner / 2, backgroundColor: colors.accent + '40' }]}>
          <Text style={{ fontFamily: 'Poppins_600SemiBold', color: colors.primary, fontSize: 11 }}>
            {info.participant.name[0]?.toUpperCase()}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarOverlap: {
    marginLeft: -10,
  },
  extraBadge: {
    marginLeft: -6,
    paddingHorizontal: 6,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  extraText: {
    color: '#FFFFFF',
    fontFamily: 'Poppins_700Bold',
    fontSize: 10,
    lineHeight: 14,
  },
  text: {
    gap: 0,
    minWidth: 0,
  },
  name: {
    ...Typography.captionMedium,
    fontSize: 12,
    lineHeight: 14,
    maxWidth: 90,
  },
  role: {
    ...Typography.caption,
    fontSize: 10,
    lineHeight: 12,
  },
});

const avatarStyles = StyleSheet.create({
  ring: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
