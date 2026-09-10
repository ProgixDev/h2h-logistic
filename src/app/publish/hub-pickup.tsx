// LE HUB DE RÉCUPÉRATION — celui qui existe, pas celui qu'on invente.
//
// 🔴 CET ÉCRAN LISAIT `getHubsByCity()` DE `services/mock/hubs.ts` : vingt-cinq
// adresses inventées, de Nice à Marseille, avec des identifiants qui ne sont
// même pas des uuid. Un cotransporteur particulier pouvait donc choisir « Gare
// de Nice-Ville » et s'y rendre — pour rien.
//
// ⚠️ LA RAISON ÉCRITE ICI A CESSÉ D'ÊTRE VRAIE. Elle disait : « `public.hubs`
// est vide, et ce n'est pas un oubli : les hubs ne sont pas des lieux qu'on
// choisit, ce sont des gens qui se portent candidats. » C'est l'inversion que
// `20260906120000` a corrigée — un hub est un point de rendez-vous que H2H
// DÉSIGNE — et l'annuaire porte 153 points actifs. Une liste vide veut donc dire
// « aucun DANS CETTE VILLE », ce qui reste légitime : on laisse publier sans hub
// plutôt que de bloquer sur un choix impossible.
//
// 🔴 ET « VIDE » NE VEUT PLUS DIRE « ILLISIBLE ». Le `catch` de cet écran notait
// lui-même qu'il n'y avait « aucun moyen de les distinguer à l'écran ». Il y en
// a un maintenant.
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Header } from '@/components/layout/Header';
import { ProgressSteps } from '@/components/ui/ProgressSteps';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { STEP_LABELS } from '@/types/route';
import { Typography } from '@/constants/Typography';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useRouteStore } from '@/stores/useRouteStore';
import { Icon } from '@/components/ui/Icon';
import { chargerHubsParVille } from '@/services/hubs';
import { iconeHub, libelleHub } from '@/constants/HubTypes';
import { HubsMap, carteDisponible } from '@/components/hub/HubsMap';
import type { Hub } from '@/types/hub';

type ViewMode = 'list' | 'map';

export default function HubPickupScreen() {
  const { colors } = useColorScheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { form, setFormField, setStep } = useRouteStore();

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const ville = form.departureCity ?? '';

  useEffect(() => {
    let annule = false;
    setChargement(true);
    chargerHubsParVille(ville)
      .then((h) => { if (annule) return; setHubs(h); setErreur(null); })
      .catch((e: unknown) => {
        // 🔴 LA TRACE NE SUFFISAIT PAS, ET CE FICHIER LE DISAIT LUI-MÊME :
        // « il n'y a aujourd'hui aucun moyen de les distinguer à l'écran ».
        // Une policy refusée et une ville sans point donnaient le même écran.
        // `erreur` les sépare enfin.
        console.error('[hubs] lecture impossible', e);
        if (annule) return;
        setHubs([]);
        setErreur(e instanceof Error ? e.message : String(e));
      })
      .finally(() => { if (!annule) setChargement(false); });
    return () => { annule = true; };
  }, [ville, tick]);

  const selectedId = form.pickupHub?.hubId;

  const selectHub = (hub: Hub) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFormField('pickupHub', { hubId: hub.id, hubName: hub.name, city: hub.city, arrivalTime: '' });
  };

  // 🔴 PUBLIER SANS HUB EST UN ÉTAT LÉGITIME, pas un contournement.
  // `published_routes.departure_hub_id` est nullable, `route_stops.city` aussi :
  // un trajet ville → ville reste exploitable par l'appariement, et la remise se
  // fait alors hors hub — ce que l'application sait déjà gérer
  // (`off_hub_possible`, `is_off_hub` sur les co-livraisons).
  const continuerSansHub = useCallback(() => {
    setFormField('pickupHub', { hubId: '', hubName: ville, city: ville, arrivalTime: '' });
    setStep(4);
    router.push('/publish/hub-delivery');
  }, [setFormField, setStep, router, ville]);

  const handleNext = () => {
    setStep(4);
    router.push('/publish/hub-delivery');
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={{ paddingTop: insets.top, paddingHorizontal: Spacing.lg }}>
        <Header title="Publier un trajet" showBack />
        <ProgressSteps current={3} total={8} label={STEP_LABELS[2]} />
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Hub de récupération</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Où pourrez-vous récupérer les colis ?
        </Text>
        <Text style={[styles.info, { color: colors.textSecondary }]}>
          Sélectionnez un hub validé dans votre ville de départ ({form.departureCity}).
        </Text>

        {/* View mode toggle — seulement si la carte native est là : proposer
            un onglet qui n'affiche qu'un écriteau, c'était le défaut. */}
        {carteDisponible && hubs.length > 0 && (
        <View style={[styles.toggleRow, { backgroundColor: colors.border + '30' }]}>
          <TouchableOpacity
            onPress={() => setViewMode('list')}
            style={[styles.toggleBtn, viewMode === 'list' && { backgroundColor: colors.surface }]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Icon name="clipboard" size={14} color={viewMode === 'list' ? colors.text : colors.textSecondary} /><Text style={[styles.toggleText, { color: viewMode === 'list' ? colors.text : colors.textSecondary }]}>Liste</Text></View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setViewMode('map')}
            style={[styles.toggleBtn, viewMode === 'map' && { backgroundColor: colors.surface }]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Icon name="map-overview" size={14} color={viewMode === 'map' ? colors.text : colors.textSecondary} /><Text style={[styles.toggleText, { color: viewMode === 'map' ? colors.text : colors.textSecondary }]}>Carte</Text></View>
          </TouchableOpacity>
        </View>
        )}

        {viewMode === 'map' && carteDisponible && hubs.length > 0 ? (
          /* ─── Carte : un appui sur l'épingle choisit le hub ─── */
          <View style={styles.mapContainer}>
            <HubsMap hubs={hubs} choisiId={selectedId} onChoisir={selectHub} />
            {(() => {
              const choisi = hubs.find((h) => h.id === selectedId);
              return choisi ? (
                <View style={[styles.hubCard, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
                  <View style={styles.hubTop}>
                    <View style={styles.hubNameRow}>
                      <Icon name={iconeHub(choisi.placeType)} size={20} color={colors.textSecondary} />
                      <Text style={[styles.hubName, { color: colors.text }]} numberOfLines={1}>{choisi.name}</Text>
                    </View>
                    <View style={[styles.checkCircle, { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                      <Text style={styles.checkIcon}>✓</Text>
                    </View>
                  </View>
                  <Text style={[styles.hubAddress, { color: colors.textSecondary }]} numberOfLines={3}>{choisi.displayDetail}</Text>
                </View>
              ) : (
                <Text style={[styles.info, { color: colors.textSecondary, textAlign: 'center' }]}>
                  Touchez une épingle pour choisir ce hub.
                </Text>
              );
            })()}
          </View>
        ) : (
          /* ─── List View ─── */
          <FlatList
            data={hubs}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
            ListEmptyComponent={
              chargement ? (
                <Text style={[styles.empty, { color: colors.textSecondary }]}>
                  Recherche des points de rendez-vous…
                </Text>
              ) : erreur ? (
                /* 🔴 « AUCUN MOYEN DE LES DISTINGUER À L'ÉCRAN » — c'était écrit
                   dans le `catch` de ce fichier, et c'était vrai : une policy
                   refusée et une ville sans point donnaient la même phrase.
                   Elles en ont deux maintenant. */
                <EmptyState
                  iconName="alert-circle"
                  title="Liste indisponible"
                  description={
                    'Les points de rendez-vous n’ont pas pu être chargés — '
                    + 'ce n’est pas qu’il n’y en a aucun ici.'
                  }
                  actionLabel="Réessayer"
                  onAction={() => setTick((t) => t + 1)}
                />
              ) : (
                /* 🔴 L'ÉTAT VIDE NE DOIT PAS ÊTRE UNE IMPASSE : dire « aucun
                   point » puis bloquer le bouton laisserait un cotransporteur
                   particulier devant une étape qu'il ne peut pas franchir.
                   ⚠️ ET LA RAISON ÉCRITE ICI A CESSÉ D'ÊTRE VRAIE. « Les points
                   relais sont des gens qui se portent candidats, le recrutement
                   se fait au lancement » : un point de rendez-vous ne se recrute
                   pas — H2H le désigne — et l'annuaire en porte 153 actifs. Il
                   peut simplement n'y en avoir aucun DANS CETTE VILLE. */
                <View style={{ gap: Spacing.md }}>
                  <Text style={[styles.empty, { color: colors.textSecondary }]}>
                    Aucun point de rendez-vous à {ville} pour l’instant.
                  </Text>
                  <Button
                    title="Continuer sans point relais"
                    onPress={continuerSansHub}
                    variant="outline"
                  />
                  <Text style={[styles.empty, { color: colors.textSecondary }]}>
                    La remise se fera alors directement, en main propre, à l’endroit
                    convenu avec le vendeur et l’acheteur.
                  </Text>
                </View>
              )
            }
            renderItem={({ item }) => {
              const selected = item.id === selectedId;
              return (
                <TouchableOpacity onPress={() => selectHub(item)} activeOpacity={0.8}>
                  {/* ⚠️ RIEN NE CHANGE DE TAILLE À LA SÉLECTION — même correction
                      qu'aux hubs de remise : bordure d'épaisseur fixe, case
                      toujours présente. La carte sautait sous le doigt. */}
                  <View style={[
                    styles.hubCard,
                    { backgroundColor: colors.surface, borderColor: selected ? colors.primary : colors.border },
                  ]}>
                    {/* Top row */}
                    <View style={styles.hubTop}>
                      <View style={styles.hubNameRow}>
                        <Icon name={iconeHub(item.placeType)} size={20} color={colors.textSecondary} />
                        <Text style={[styles.hubName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                      </View>
                      <View
                        style={[
                          styles.checkCircle,
                          selected
                            ? { backgroundColor: colors.primary, borderColor: colors.primary }
                            : { borderColor: colors.border },
                        ]}
                      >
                        {selected && <Text style={styles.checkIcon}>✓</Text>}
                      </View>
                    </View>

                    {/* 🔴 LE DÉTAIL AFFICHÉ, pas l adresse et les horaires. Le
                        protocole de nommage dit que le nom seul ne suffit
                        jamais : c est cette ligne qui dit où se présenter. Les
                        horaires décrivaient un entrepôt.
                        ⚠️ ET PLUS LA VILLE EN DESSOUS : le détail l'écrit déjà
                        (« Chemin du Génie, Marseille »), et c'est la ville qu'on
                        vient de choisir — « Marseille » s'affichait deux fois. */}
                    <Text style={[styles.hubAddress, { color: colors.textSecondary }]} numberOfLines={3}>{item.displayDetail}</Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <Button title="Suivant" onPress={handleNext} variant="gradient" disabled={!selectedId} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flex: 1, paddingHorizontal: Spacing.xxl, paddingTop: Spacing.xl, gap: Spacing.md },
  title: { ...Typography.h1 },
  subtitle: { ...Typography.body, marginTop: -Spacing.xs },
  info: { ...Typography.caption, lineHeight: 18 },

  // Toggle
  toggleRow: { flexDirection: 'row', borderRadius: BorderRadius.sm, padding: 3, gap: 0 },
  toggleBtn: { flex: 1, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm - 2, alignItems: 'center' },
  toggleText: { ...Typography.captionMedium },

  // Map
  mapContainer: { flex: 1, gap: Spacing.md },

  // List
  list: { paddingBottom: Spacing.md },
  empty: { ...Typography.body, textAlign: 'center', paddingVertical: Spacing.xxl },

  // Hub card
  hubCard: { borderWidth: 2, borderRadius: BorderRadius.lg, padding: Spacing.lg, gap: Spacing.xs },
  hubTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 24 },
  hubNameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1, marginRight: Spacing.sm },
  hubTypeIcon: { fontSize: 20 },
  hubName: { ...Typography.bodyMedium, flex: 1 },
  hubAddress: { ...Typography.caption, paddingLeft: 28 },
  checkCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  checkIcon: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  // Partner
  partnerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.xs, paddingLeft: 28 },
  packageCount: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.full },
  packageCountText: { ...Typography.caption, fontSize: 11 },

  footer: { paddingHorizontal: Spacing.xxl },
});
