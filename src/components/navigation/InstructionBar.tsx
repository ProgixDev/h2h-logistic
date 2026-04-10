import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { RouteStep } from '@/services/routing';
import { Icon } from '@/components/ui/Icon';
import { getManeuverIcon, getShortInstruction, formatStepDistance } from '@/utils/navigationHelpers';
import { Typography } from '@/constants/Typography';
import { Spacing, BorderRadius } from '@/constants/Spacing';

interface InstructionBarProps {
  currentStep: RouteStep | null;
  nextStep: RouteStep | null;
  distanceToNext: number; // meters
}

export function InstructionBar({ currentStep, nextStep, distanceToNext }: InstructionBarProps) {
  if (!currentStep) return null;

  const iconName = getManeuverIcon(currentStep.maneuver.type, currentStep.maneuver.modifier);
  const instruction = getShortInstruction(currentStep);
  const streetName = currentStep.name || '';

  return (
    <LinearGradient
      colors={['#14248A', '#2A8A6A']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.container}
    >
      {/* Main instruction */}
      <View style={styles.mainRow}>
        <Icon name={iconName} size={36} color="#FFFFFF" />
        <View style={styles.textCol}>
          <Text style={styles.distance}>{formatStepDistance(distanceToNext)}</Text>
          <Text style={styles.instruction} numberOfLines={1}>{instruction}</Text>
          {streetName ? <Text style={styles.street} numberOfLines={1}>{streetName}</Text> : null}
        </View>
      </View>

      {/* Next instruction preview */}
      {nextStep && nextStep.maneuver.type !== 'arrive' && (
        <View style={styles.nextRow}>
          <Icon name={getManeuverIcon(nextStep.maneuver.type, nextStep.maneuver.modifier)} size={18} color="rgba(255,255,255,0.7)" />
          <Text style={styles.nextText} numberOfLines={1}>
            Puis {getShortInstruction(nextStep).toLowerCase()}
          </Text>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  icon: {
    fontSize: 36,
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  distance: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 28,
    lineHeight: 34,
    color: '#FFFFFF',
  },
  instruction: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  street: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  nextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.2)',
    paddingTop: Spacing.sm,
  },
  nextIcon: {
    fontSize: 18,
  },
  nextText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    flex: 1,
  },
});
