import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { ConversationRow } from './ConversationRow';
import { Typography } from '@/constants/Typography';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';
import type { MissionParticipant } from '@/types/mission';

interface ConversationGroupProps {
  missionId: string;
  listingTitle: string;
  routeSummary: string;
  missionCode: string;
  seller: MissionParticipant;
  buyer: MissionParticipant;
  sellerLastMessage: string;
  sellerTimestamp: string;
  sellerUnreadCount: number;
  buyerLastMessage: string;
  buyerTimestamp: string;
  buyerUnreadCount: number;
  statusLabel?: string;
  statusVariant?: 'default' | 'success' | 'warning';
  completed?: boolean;
  onOpenChat: (participant: MissionParticipant, role: 'seller' | 'buyer') => void;
}

export function ConversationGroup({
  missionId,
  listingTitle,
  routeSummary,
  missionCode,
  seller,
  buyer,
  sellerLastMessage,
  sellerTimestamp,
  sellerUnreadCount,
  buyerLastMessage,
  buyerTimestamp,
  buyerUnreadCount,
  statusLabel,
  statusVariant = 'default',
  completed = false,
  onOpenChat,
}: ConversationGroupProps) {
  const { colors } = useColorScheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          shadowColor: '#000',
          opacity: completed ? 0.85 : 1,
        },
      ]}
      accessibilityLabel={`Conversation de la co-livraison ${listingTitle}, ${routeSummary}`}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.headerIcon, { backgroundColor: colors.accentLight }]}>
          <Icon name="package" size={18} color={colors.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {listingTitle}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {routeSummary} · {missionCode}
          </Text>
        </View>
        {completed ? (
          <Badge label="Terminée" variant="success" />
        ) : statusLabel ? (
          <Badge label={statusLabel} variant={statusVariant} />
        ) : null}
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* Seller row */}
      <ConversationRow
        participant={seller}
        role="seller"
        lastMessage={sellerLastMessage}
        timestamp={sellerTimestamp}
        unreadCount={sellerUnreadCount}
        onPress={() => onOpenChat(seller, 'seller')}
      />

      {/* Indented inner divider */}
      <View style={[styles.innerDivider, { backgroundColor: colors.border }]} />

      {/* Buyer row */}
      <ConversationRow
        participant={buyer}
        role="buyer"
        lastMessage={buyerLastMessage}
        timestamp={buyerTimestamp}
        unreadCount={buyerUnreadCount}
        onPress={() => onOpenChat(buyer, 'buyer')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...Typography.bodyMedium,
    fontFamily: 'Poppins_600SemiBold',
  },
  subtitle: {
    ...Typography.caption,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  innerDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 80,
  },
});
