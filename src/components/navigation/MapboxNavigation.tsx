import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';

export type MapboxNavigationProps = {
  origin: { latitude: number; longitude: number };
  destination: { latitude: number; longitude: number };
  voiceEnabled: boolean;
  onArrived: () => void;
  onCancel: () => void;
  onProgress?: (progress: {
    distanceRemaining: number;
    distanceTraveled: number;
    durationRemaining: number;
    fractionTraveled: number;
  }) => void;
  onOffRoute?: () => void;
  onReroute?: () => void;
};

export function MapboxNavigation({ onArrived, onCancel }: MapboxNavigationProps) {
  return (
    <View style={styles.placeholder}>
      <Icon name="navigate" size={56} color="#F59E0B" />
      <Text style={styles.title}>Navigation temporairement indisponible</Text>
      <Text style={styles.body}>
        La navigation guidée sera réactivée prochainement. En attendant, utilisez votre
        application de navigation préférée pour rejoindre la destination.
      </Text>
      <View style={styles.actions}>
        <Button title="Je suis arrivé" onPress={onArrived} variant="gradient" />
        <Button title="Retour" onPress={onCancel} variant="outline" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
    gap: Spacing.md,
    backgroundColor: '#1A1A1E',
  },
  title: {
    ...Typography.h3,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  body: {
    ...Typography.body,
    color: '#E5E7EB',
    textAlign: 'center',
    lineHeight: 22,
  },
  actions: {
    marginTop: Spacing.xl,
    gap: Spacing.md,
    alignSelf: 'stretch',
  },
});
