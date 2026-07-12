import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Header } from '@/components/layout/Header';
import { ProgressSteps } from '@/components/ui/ProgressSteps';
import { Button } from '@/components/ui/Button';
import { ResponsibilitiesCard } from '@/components/mission/ResponsibilitiesCard';
import { Icon, type IconName } from '@/components/ui/Icon';
import { STEP_LABELS } from '@/types/route';
import { Typography } from '@/constants/Typography';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useRouteStore } from '@/stores/useRouteStore';
import type { RouteType } from '@/types/route';

export default function PublishTypeScreen() {
  const { colors } = useColorScheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { form, setFormField, resetForm, setStep } = useRouteStore();

  React.useEffect(() => { resetForm(); }, []);

  const select = (type: RouteType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFormField('type', type);
  };

  const handleNext = () => {
    setStep(2);
    router.push('/publish/cities');
  };

  const options: { type: RouteType; iconName: IconName; title: string; sub: string; hint: string }[] = [
    { type: 'recurring', iconName: 'repeat', title: 'Trajet récurrent', sub: 'Domicile-travail, études, déplacement habituel', hint: 'Idéal pour proposer un trajet habituel' },
    { type: 'one_time', iconName: 'location-filled', title: 'Trajet ponctuel', sub: 'Voyage, déplacement exceptionnel ou unique', hint: 'Parfait pour un trajet occasionnel' },
  ];

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={{ paddingTop: insets.top, paddingHorizontal: Spacing.lg }}>
        <Header title="Publier un trajet" showBack />
        <ProgressSteps current={1} total={8} label={STEP_LABELS[0]} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.text }]}>Quel type de trajet ?</Text>

        <View style={styles.options}>
          {options.map((opt) => {
            const selected = form.type === opt.type;
            return (
              <TouchableOpacity key={opt.type} onPress={() => select(opt.type)} activeOpacity={0.8}>
                <View style={[
                  styles.optionCard,
                  { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary + '08' : colors.surface },
                  selected && { borderWidth: 2 },
                ]}>
                  <Icon name={opt.iconName} size={36} color={selected ? colors.primary : colors.textSecondary} />
                  <View style={styles.optionText}>
                    <Text style={[styles.optionTitle, { color: colors.text }]}>{opt.title}</Text>
                    <Text style={[styles.optionSub, { color: colors.textSecondary }]}>{opt.sub}</Text>
                    <Text style={[styles.optionHint, { color: colors.primary }]}>{opt.hint}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Consignes & responsabilités du cotransporteur particulier */}
        <ResponsibilitiesCard />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <Button title="Suivant" onPress={handleNext} variant="gradient" disabled={!form.type} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: Spacing.xxl, paddingTop: Spacing.xxxl, paddingBottom: Spacing.xl, gap: Spacing.xxl },
  title: { ...Typography.h1 },
  options: { gap: Spacing.lg },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    gap: Spacing.lg,
    minHeight: 120,
  },
  optionIcon: { fontSize: 36 },
  optionText: { flex: 1, gap: Spacing.xs },
  optionTitle: { ...Typography.h3 },
  optionSub: { ...Typography.body, lineHeight: 20 },
  optionHint: { ...Typography.captionMedium, marginTop: 2 },
  footer: { paddingHorizontal: Spacing.xxl },
});
