import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Header } from '@/components/layout/Header';
import { ProgressSteps } from '@/components/ui/ProgressSteps';
import { Button } from '@/components/ui/Button';
import { STEP_LABELS } from '@/types/route';
import { Typography } from '@/constants/Typography';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useRouteStore } from '@/stores/useRouteStore';

export default function PublishOptionsScreen() {
  const { colors } = useColorScheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { form, setFormField, setStep } = useRouteStore();

  const handleToggle = (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFormField('horsHub', value);
  };

  const handleNext = () => {
    setStep(9);
    router.push('/publish/review');
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={{ paddingTop: insets.top, paddingHorizontal: Spacing.lg }}>
        <Header title="Publier un trajet" showBack />
        <ProgressSteps current={8} total={9} label={STEP_LABELS[7]} />
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Options supplémentaires</Text>

        <View style={[
          styles.toggleCard,
          {
            backgroundColor: form.horsHub ? colors.success + '10' : colors.surface,
            borderColor: form.horsHub ? colors.success : colors.border,
          },
        ]}>
          <View style={styles.toggleTop}>
            <View style={styles.toggleInfo}>
              <Text style={[styles.toggleTitle, { color: colors.text }]}>Hors hub possible</Text>
              <Text style={[styles.toggleDesc, { color: colors.textSecondary }]}>
                Vous acceptez de façon exceptionnelle d'étudier une remise ou prise en charge en dehors d'un hub.
              </Text>
            </View>
            <Switch
              value={form.horsHub}
              onValueChange={handleToggle}
              trackColor={{ false: colors.border, true: colors.success }}
              thumbColor="#FFFFFF"
            />
          </View>
          <Text style={[styles.toggleSmall, { color: colors.textSecondary }]}>
            Cette option reste sous votre contrôle total. Vous pourrez toujours refuser.
          </Text>
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <Button title="Suivant" onPress={handleNext} variant="gradient" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flex: 1, paddingHorizontal: Spacing.xxl, paddingTop: Spacing.xxxl, gap: Spacing.xxl },
  title: { ...Typography.h1 },
  toggleCard: { borderWidth: 1.5, borderRadius: BorderRadius.lg, padding: Spacing.lg, gap: Spacing.md },
  toggleTop: { flexDirection: 'row', gap: Spacing.lg },
  toggleInfo: { flex: 1, gap: Spacing.xs },
  toggleTitle: { ...Typography.h3 },
  toggleDesc: { ...Typography.body, lineHeight: 22 },
  toggleSmall: { ...Typography.caption, fontStyle: 'italic', lineHeight: 18 },
  footer: { paddingHorizontal: Spacing.xxl },
});
