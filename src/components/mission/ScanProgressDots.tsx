import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';

export type ScanStepKey = 'party' | 'package';
export type ScanStepState = 'pending' | 'active' | 'done';

interface ScanProgressDotsProps {
  partyLabel: string; // "Vendeur" or "Acheteur"
  partyState: ScanStepState;
  packageState: ScanStepState;
}

export function ScanProgressDots({ partyLabel, partyState, packageState }: ScanProgressDotsProps) {
  const { colors } = useColorScheme();

  return (
    <View
      style={styles.row}
      accessibilityLabel={`Progression: ${partyLabel} ${partyState}, Colis ${packageState}`}
    >
      <Dot index={1} label={partyLabel} state={partyState} colors={colors} />
      <View style={[styles.connector, { backgroundColor: partyState === 'done' ? colors.success : colors.border }]} />
      <Dot index={2} label="Colis" state={packageState} colors={colors} />
    </View>
  );
}

function Dot({
  index,
  label,
  state,
  colors,
}: {
  index: number;
  label: string;
  state: ScanStepState;
  colors: any;
}) {
  const isActive = state === 'active';
  const isDone = state === 'done';

  const bg = isDone ? colors.success : isActive ? colors.primary : colors.border;
  const textColor = isActive || isDone ? colors.text : colors.textSecondary;

  return (
    <View style={styles.dotCol}>
      <View style={[styles.dot, { backgroundColor: bg }]}>
        {isDone ? (
          <Icon name="checkmark" size={14} color="#FFFFFF" />
        ) : (
          <Text style={styles.dotNum}>{index}</Text>
        )}
      </View>
      <Text style={[styles.label, { color: textColor, fontFamily: isActive ? 'Poppins_600SemiBold' : 'Poppins_500Medium' }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  dotCol: {
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotNum: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 13,
    lineHeight: 18,
    color: '#FFFFFF',
  },
  label: {
    ...Typography.caption,
  },
  connector: {
    width: 40,
    height: 2,
    marginBottom: 18,
  },
});
