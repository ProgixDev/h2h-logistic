import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Header } from '@/components/layout/Header';
import { ProgressSteps } from '@/components/ui/ProgressSteps';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon, type IconName } from '@/components/ui/Icon';
import { PACKAGE_SIZES, type PackageSize } from '@/constants/TransportTypes';
import { STEP_LABELS } from '@/types/route';
import { Typography } from '@/constants/Typography';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useRouteStore } from '@/stores/useRouteStore';

const SIZE_INFO: Record<string, { label: string; iconName: IconName; hint: string }> = {
  XS: { label: 'Enveloppe', iconName: 'envelope', hint: '~15 cm' },
  S: { label: 'Petit colis', iconName: 'package', hint: '~30 cm' },
  M: { label: 'Colis moyen', iconName: 'package', hint: '~50 cm' },
  L: { label: 'Grand colis', iconName: 'package', hint: '~80 cm' },
  XL: { label: 'Très grand', iconName: 'package', hint: '~120 cm' },
};

const WEIGHT_OPTIONS = [1, 2, 5, 10, 15, 20] as const;

export default function PublishCapacityScreen() {
  const { colors } = useColorScheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { form, setFormField, setStep } = useRouteStore();

  const pkg = form.maxPackages;
  const maxSize = form.maxSize;
  const maxWeight = form.maxWeight;

  const incPackages = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (pkg < 10) setFormField('maxPackages', pkg + 1);
  };
  const decPackages = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (pkg > 1) setFormField('maxPackages', pkg - 1);
  };

  const canNext = !!maxSize && maxWeight > 0;

  const handleNext = () => {
    setStep(8);
    router.push('/publish/options');
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={{ paddingTop: insets.top, paddingHorizontal: Spacing.lg }}>
        <Header title="Publier un trajet" showBack />
        <ProgressSteps current={7} total={9} label={STEP_LABELS[6]} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.text }]}>Votre capacité de transport</Text>

        {/* Stepper */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>Nombre maximum de colis</Text>
          <View style={styles.stepperRow}>
            <TouchableOpacity onPress={decPackages} style={[styles.stepperBtn, { borderColor: colors.border, opacity: pkg <= 1 ? 0.3 : 1 }]}>
              <Text style={[styles.stepperIcon, { color: colors.text }]}>−</Text>
            </TouchableOpacity>
            <Text style={[styles.stepperValue, { color: colors.primary }]}>{pkg}</Text>
            <TouchableOpacity onPress={incPackages} style={[styles.stepperBtn, { borderColor: colors.border, opacity: pkg >= 10 ? 0.3 : 1 }]}>
              <Text style={[styles.stepperIcon, { color: colors.text }]}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Size selector */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>Taille maximum acceptée</Text>
          <View style={styles.sizesRow}>
            {PACKAGE_SIZES.map((size) => {
              const info = SIZE_INFO[size];
              const selected = maxSize === size;
              return (
                <TouchableOpacity
                  key={size}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setFormField('maxSize', size);
                  }}
                  style={[styles.sizeCard, { backgroundColor: selected ? colors.primary + '10' : colors.surface, borderColor: selected ? colors.primary : colors.border }, selected && { borderWidth: 2 }]}
                >
                  <Icon name={info.iconName} size={20} color={selected ? colors.primary : colors.textSecondary} />
                  <Text style={[styles.sizeLabel, { color: selected ? colors.primary : colors.text }]}>{size}</Text>
                  <Text style={[styles.sizeHint, { color: colors.textSecondary }]}>{info.hint}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {maxSize && <Text style={[styles.sizeDesc, { color: colors.textSecondary }]}>{SIZE_INFO[maxSize].label}</Text>}
        </View>

        {/* Weight selector */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>Poids maximum accepté</Text>
          <View style={styles.weightRow}>
            {WEIGHT_OPTIONS.map((w) => {
              const selected = maxWeight === w;
              return (
                <TouchableOpacity
                  key={w}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setFormField('maxWeight', w);
                  }}
                  style={[styles.weightChip, { backgroundColor: selected ? colors.primary : 'transparent', borderColor: selected ? colors.primary : colors.border }]}
                >
                  <Text style={[styles.weightText, { color: selected ? '#FFFFFF' : colors.text }]}>
                    {w}{w === 20 ? '+' : ''} kg
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Summary */}
        {canNext && (
          <Card style={{ ...styles.summaryCard, backgroundColor: colors.primary + '08' }}>
            <Text style={[styles.summaryText, { color: colors.primary }]}>
              Vous acceptez jusqu'à {pkg} colis de taille {maxSize} max, {maxWeight} kg max
            </Text>
          </Card>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <Button title="Suivant" onPress={handleNext} variant="gradient" disabled={!canNext} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.xxl, paddingTop: Spacing.xl, paddingBottom: Spacing.lg, gap: Spacing.xxl },
  title: { ...Typography.h1 },
  section: { gap: Spacing.md },
  sectionLabel: { ...Typography.h3 },
  // Stepper
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xxl },
  stepperBtn: { width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  stepperIcon: { fontSize: 24, lineHeight: 26 },
  stepperValue: { fontFamily: 'Poppins_700Bold', fontSize: 32, lineHeight: 40, minWidth: 40, textAlign: 'center' },
  // Sizes
  sizesRow: { flexDirection: 'row', gap: Spacing.sm },
  sizeCard: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1.5, gap: 2 },
  sizeIcon: { fontSize: 20 },
  sizeLabel: { ...Typography.captionMedium },
  sizeHint: { fontSize: 10, lineHeight: 12 },
  sizeDesc: { ...Typography.caption, textAlign: 'center' },
  // Weights
  weightRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  weightChip: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, borderWidth: 1.5 },
  weightText: { ...Typography.captionMedium },
  // Summary
  summaryCard: { borderColor: 'transparent' },
  summaryText: { ...Typography.bodyMedium, textAlign: 'center' },
  footer: { paddingHorizontal: Spacing.xxl },
});
