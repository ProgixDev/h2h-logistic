import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Header } from '@/components/layout/Header';
import { ProgressSteps } from '@/components/ui/ProgressSteps';
import { Button } from '@/components/ui/Button';
import { STEP_LABELS } from '@/types/route';
import { CITIES } from '@/constants/Cities';
import { Typography } from '@/constants/Typography';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useRouteStore } from '@/stores/useRouteStore';

type Field = 'departureCity' | 'arrivalCity';

export default function PublishCitiesScreen() {
  const { colors } = useColorScheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { form, setFormField, setStep } = useRouteStore();
  const [activeField, setActiveField] = useState<Field>('departureCity');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return CITIES.filter((c) => c.toLowerCase().includes(q));
  }, [search]);

  const selectCity = (city: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFormField(activeField, city);
    if (activeField === 'departureCity' && !form.arrivalCity) {
      setActiveField('arrivalCity');
    }
  };

  const canNext = !!form.departureCity && !!form.arrivalCity && form.departureCity !== form.arrivalCity;

  const handleNext = () => {
    setStep(3);
    router.push('/publish/hub-pickup');
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={{ paddingTop: insets.top, paddingHorizontal: Spacing.lg }}>
        <Header title="Publier un trajet" showBack />
        <ProgressSteps current={2} total={9} label={STEP_LABELS[1]} />
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Votre corridor de trajet</Text>

        {/* City selector pills */}
        <View style={styles.pillsRow}>
          <TouchableOpacity
            onPress={() => setActiveField('departureCity')}
            style={[styles.pill, { borderColor: activeField === 'departureCity' ? colors.primary : colors.border, backgroundColor: form.departureCity ? colors.primary + '10' : colors.surface }]}
          >
            <Text style={[styles.pillLabel, { color: colors.textSecondary }]}>Départ</Text>
            <Text style={[styles.pillValue, { color: form.departureCity ? colors.text : colors.textSecondary }]}>
              {form.departureCity ?? 'Sélectionnez'}
            </Text>
          </TouchableOpacity>

          {/* Arrow */}
          <Text style={[styles.arrow, { color: colors.primary }]}>→</Text>

          <TouchableOpacity
            onPress={() => setActiveField('arrivalCity')}
            style={[styles.pill, { borderColor: activeField === 'arrivalCity' ? colors.primary : colors.border, backgroundColor: form.arrivalCity ? colors.primary + '10' : colors.surface }]}
          >
            <Text style={[styles.pillLabel, { color: colors.textSecondary }]}>Arrivée</Text>
            <Text style={[styles.pillValue, { color: form.arrivalCity ? colors.text : colors.textSecondary }]}>
              {form.arrivalCity ?? 'Sélectionnez'}
            </Text>
          </TouchableOpacity>
        </View>

        {form.departureCity === form.arrivalCity && form.departureCity && (
          <Text style={[styles.errorHint, { color: colors.error }]}>
            La ville d'arrivée doit être différente du départ.
          </Text>
        )}

        {/* City list */}
        <FlatList
          data={filtered}
          keyExtractor={(item) => item}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const isCurrent = item === (activeField === 'departureCity' ? form.departureCity : form.arrivalCity);
            const isOther = activeField === 'arrivalCity' ? item === form.departureCity : item === form.arrivalCity;
            return (
              <TouchableOpacity
                onPress={() => !isOther && selectCity(item)}
                disabled={isOther}
                style={[styles.cityRow, { borderBottomColor: colors.border }, isCurrent && { backgroundColor: colors.primary + '10' }, isOther && { opacity: 0.35 }]}
              >
                <Text style={[styles.cityName, { color: colors.text }]}>{item}</Text>
                {isCurrent && <Text style={[styles.cityCheck, { color: colors.primary }]}>✓</Text>}
                {isOther && <Text style={[styles.cityUsed, { color: colors.textSecondary }]}>
                  {activeField === 'arrivalCity' ? 'Départ' : 'Arrivée'}
                </Text>}
              </TouchableOpacity>
            );
          }}
        />

        <Text style={[styles.info, { color: colors.textSecondary }]}>
          Le système se base sur les villes et les hubs, pas sur votre adresse personnelle.
        </Text>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <Button title="Suivant" onPress={handleNext} variant="gradient" disabled={!canNext} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flex: 1, paddingHorizontal: Spacing.xxl, paddingTop: Spacing.xl, gap: Spacing.lg },
  title: { ...Typography.h1 },
  pillsRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  pill: { flex: 1, borderWidth: 1.5, borderRadius: BorderRadius.md, padding: Spacing.md, gap: 2 },
  pillLabel: { ...Typography.caption },
  pillValue: { ...Typography.bodyMedium },
  arrow: { fontSize: 22, fontWeight: '700' },
  errorHint: { ...Typography.caption, marginTop: -Spacing.sm },
  list: { gap: 0 },
  cityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.md, paddingHorizontal: Spacing.sm, borderBottomWidth: 0.5, borderRadius: BorderRadius.sm },
  cityName: { ...Typography.body },
  cityCheck: { ...Typography.bodyMedium, fontSize: 16 },
  cityUsed: { ...Typography.caption },
  info: { ...Typography.caption, textAlign: 'center', lineHeight: 18, paddingHorizontal: Spacing.sm },
  footer: { paddingHorizontal: Spacing.xxl },
});
