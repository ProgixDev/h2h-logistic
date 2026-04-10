import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { MissionParticipant } from '@/types/mission';
import { Card } from '@/components/ui/Card';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';

interface ParticipantsCardProps {
  seller: MissionParticipant;
  buyer: MissionParticipant;
  transporter: MissionParticipant;
}

function ParticipantRow({
  participant,
  roleLabel,
  roleIconName,
}: {
  participant: MissionParticipant;
  roleLabel: string;
  roleIconName: IconName;
}) {
  const { colors } = useColorScheme();

  return (
    <View style={styles.row}>
      <Icon name={roleIconName} size={24} color={colors.primary} />
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.text }]}>{participant.name}</Text>
        <Text style={[styles.role, { color: colors.textSecondary }]}>{roleLabel}</Text>
      </View>
    </View>
  );
}

export function ParticipantsCard({ seller, buyer, transporter }: ParticipantsCardProps) {
  return (
    <Card>
      <ParticipantRow participant={seller} roleLabel="Vendeur" roleIconName="hub-partner" />
      <ParticipantRow participant={transporter} roleLabel="Transporteur" roleIconName="car" />
      <ParticipantRow participant={buyer} roleLabel="Acheteur" roleIconName="person-add" />
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  roleIcon: {
    fontSize: 24,
  },
  info: {
    flex: 1,
  },
  name: {
    ...Typography.bodyMedium,
  },
  role: {
    ...Typography.caption,
  },
});
