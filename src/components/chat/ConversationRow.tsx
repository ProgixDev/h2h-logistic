import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { Typography } from '@/constants/Typography';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';
import type { MissionParticipant } from '@/types/mission';

interface ConversationRowProps {
  participant: MissionParticipant;
  role: 'seller' | 'buyer';
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  onPress: () => void;
}

export function ConversationRow({
  participant,
  role,
  lastMessage,
  timestamp,
  unreadCount,
  onPress,
}: ConversationRowProps) {
  const { colors } = useColorScheme();
  const roleLabel = role === 'seller' ? 'Vendeuse/Vendeur' : 'Acheteuse/Acheteur';
  const shortRole = role === 'seller' ? 'Vendeur' : 'Acheteur';
  const ringColor = role === 'seller' ? colors.primary : colors.accent;

  const handlePress = () => {
    Haptics.selectionAsync();
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Ouvrir la discussion avec ${participant.name}, ${roleLabel}${
        unreadCount > 0 ? `, ${unreadCount} message${unreadCount > 1 ? 's' : ''} non lu${unreadCount > 1 ? 's' : ''}` : ''
      }`}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}
    >
      {/* Avatar with role ring */}
      <View style={[styles.avatarRing, { borderColor: ringColor }]}>
        {participant.avatar ? (
          <Image source={{ uri: participant.avatar }} style={styles.avatar} contentFit="cover" />
        ) : (
          <View style={[styles.avatar, { backgroundColor: colors.accent + '40', alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={{ fontFamily: 'Poppins_600SemiBold', color: colors.primary, fontSize: 16 }}>
              {participant.name[0]?.toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      {/* Middle: name + role / last message */}
      <View style={styles.middle}>
        <View style={styles.nameLine}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {participant.name}
          </Text>
          <Text style={[styles.role, { color: colors.textSecondary }]}>({shortRole})</Text>
        </View>
        <Text
          style={[
            styles.lastMessage,
            { color: unreadCount > 0 ? colors.text : colors.textSecondary, fontFamily: unreadCount > 0 ? 'Poppins_500Medium' : 'Poppins_400Regular' },
          ]}
          numberOfLines={1}
        >
          {lastMessage}
        </Text>
      </View>

      {/* Right: timestamp + unread */}
      <View style={styles.right}>
        <Text style={[styles.time, { color: colors.textSecondary }]}>{timestamp}</Text>
        {unreadCount > 0 ? (
          <View style={[styles.unread, { backgroundColor: colors.primary }]}>
            <Text style={styles.unreadText}>{unreadCount}</Text>
          </View>
        ) : (
          <View style={styles.unreadPlaceholder} />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 72,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  avatarRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  middle: {
    flex: 1,
    gap: 2,
  },
  nameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    ...Typography.bodyMedium,
    flexShrink: 1,
  },
  role: {
    ...Typography.caption,
  },
  lastMessage: {
    fontSize: 13,
    lineHeight: 18,
  },
  right: {
    alignItems: 'flex-end',
    gap: 4,
    minWidth: 48,
  },
  time: {
    ...Typography.caption,
    fontSize: 11,
  },
  unread: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: {
    color: '#FFFFFF',
    fontFamily: 'Poppins_700Bold',
    fontSize: 11,
    lineHeight: 14,
  },
  unreadPlaceholder: {
    height: 20,
  },
});
