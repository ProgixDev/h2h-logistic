import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Header } from '@/components/layout/Header';
import { ProgressSteps } from '@/components/ui/ProgressSteps';
import { Button } from '@/components/ui/Button';
import { TRANSPORT_TYPES, type TransportTypeId } from '@/constants/TransportTypes';
import { STEP_LABELS } from '@/types/route';
import { Typography } from '@/constants/Typography';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useRouteStore } from '@/stores/useRouteStore';

export default function PublishTransportScreen() {
  const { colors } = useColorScheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { form, setFormField, setStep } = useRouteStore();

  const select = (id: TransportTypeId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFormField('transportType', id);
  };

  const handleNext = () => {
    setStep(7);
    router.push('/publish/capacity');
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={{ paddingTop: insets.top, paddingHorizontal: Spacing.lg }}>
        <Header title="Publier un trajet" showBack />
        <ProgressSteps current={6} total={9} label={STEP_LABELS[5]} />
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Votre moyen de transport</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Comment vous déplacez-vous sur ce trajet ?
        </Text>

        <View style={styles.grid}>
          {TRANSPORT_TYPES.map((t) => {
            const selected = form.transportType === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                onPress={() => select(t.id)}
                activeOpacity={0.8}
                style={styles.gridItem}
              >
                <View style={[
                  styles.card,
                  { backgroundColor: selected ? colors.primary + '10' : colors.surface, borderColor: selected ? colors.primary : colors.border },
                  selected && { borderWidth: 2 },
                ]}>
                  <Image source={t.image} style={styles.image} resizeMode="contain" />
                  <Text style={[styles.label, { color: selected ? colors.primary : colors.text }]}>{t.label}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.info, { color: colors.textSecondary }]}>
          Cette information influence la taille et le poids des colis proposés.
        </Text>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <Button title="Suivant" onPress={handleNext} variant="gradient" disabled={!form.transportType} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flex: 1, paddingHorizontal: Spacing.xxl, paddingTop: Spacing.xl, gap: Spacing.xl },
  title: { ...Typography.h1 },
  subtitle: { ...Typography.body, marginTop: -Spacing.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  gridItem: { width: '47%' },
  card: { alignItems: 'center', justifyContent: 'center', height: 96, borderRadius: BorderRadius.lg, borderWidth: 1.5, gap: Spacing.xs },
  image: { width: 40, height: 40 },
  label: { ...Typography.captionMedium },
  info: { ...Typography.caption, textAlign: 'center', lineHeight: 18 },
  footer: { paddingHorizontal: Spacing.xxl },
});
