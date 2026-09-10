// LE CORRIDOR D'UN TRAJET : UNE VILLE DE DÉPART, UNE VILLE D'ARRIVÉE.
//
// 🔴 CET ÉCRAN PROPOSAIT DIX VILLES ÉCRITES À LA MAIN (vu à l'émulateur le
// 10/09/2026) — dont Monaco, qui n'a aucun point de rendez-vous — quand
// l'annuaire des hubs en couvre près de trois cents. Un trajet part d'un hub et
// arrive à un hub : les villes proposées sont désormais CELLES QUI EN ONT, lues
// dans l'annuaire, avec une recherche — le champ `search` existait déjà, mais
// aucune zone de saisie ne l'alimentait.
//
// ⚠️ `CITIES` RESTE LA LISTE DE L'INSCRIPTION (« Ville principale »), où l'on
// déclare où l'on HABITE — Monaco y a sa place. Ici on déclare par où l'on
// PASSE, et seul l'annuaire le sait.
import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Header } from '@/components/layout/Header';
import { ProgressSteps } from '@/components/ui/ProgressSteps';
import { Button } from '@/components/ui/Button';
import { STEP_LABELS } from '@/types/route';
import { chargerVillesAvecHubs } from '@/services/hubs';
import { correspondRecherche } from '@/utils/rechercheVille';
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
  const [villes, setVilles] = useState<string[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let vivant = true;
    setChargement(true);
    chargerVillesAvecHubs()
      .then((v) => { if (vivant) { setVilles(v); setErreur(null); } })
      .catch((e: unknown) => {
        console.error('[villes] lecture impossible', e);
        if (vivant) setErreur(e instanceof Error ? e.message : String(e));
      })
      .finally(() => { if (vivant) setChargement(false); });
    return () => { vivant = false; };
  }, [tick]);

  // ⚠️ SANS ACCENTS NI TIRETS : « st raphael » trouve « Saint-Raphaël ».
  const filtered = useMemo(
    () => villes.filter((c) => correspondRecherche(c, search)),
    [villes, search],
  );

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
        <ProgressSteps current={2} total={8} label={STEP_LABELS[1]} />
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
            La ville d’arrivée doit être différente du départ.
          </Text>
        )}

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={`Rechercher parmi ${villes.length || '…'} villes`}
          placeholderTextColor={colors.textSecondary}
          autoCorrect={false}
          autoCapitalize="words"
          clearButtonMode="while-editing"
          accessibilityLabel="Rechercher une ville"
          style={[styles.search, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
        />

        {/* City list */}
        <FlatList
          data={filtered}
          keyExtractor={(item) => item}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.vide}>
              {chargement ? (
                <Text style={[styles.info, { color: colors.textSecondary }]}>Chargement des villes…</Text>
              ) : erreur ? (
                <>
                  <Text style={[styles.info, { color: colors.textSecondary }]}>
                    Les villes n’ont pas pu être chargées — ce n’est pas qu’il n’y en a aucune.
                  </Text>
                  <Button title="Réessayer" onPress={() => setTick((t) => t + 1)} variant="outline" />
                </>
              ) : (
                <Text style={[styles.info, { color: colors.textSecondary }]}>
                  Aucune ville avec un point de rendez-vous ne correspond à « {search} ».
                </Text>
              )}
            </View>
          }
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
  list: { gap: 0, flexGrow: 1 },
  search: { borderWidth: 1.5, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, ...Typography.body },
  vide: { gap: Spacing.md, paddingVertical: Spacing.xl },
  cityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.md, paddingHorizontal: Spacing.sm, borderBottomWidth: 0.5, borderRadius: BorderRadius.sm },
  cityName: { ...Typography.body },
  cityCheck: { ...Typography.bodyMedium, fontSize: 16 },
  cityUsed: { ...Typography.caption },
  info: { ...Typography.caption, textAlign: 'center', lineHeight: 18, paddingHorizontal: Spacing.sm },
  footer: { paddingHorizontal: Spacing.xxl },
});
