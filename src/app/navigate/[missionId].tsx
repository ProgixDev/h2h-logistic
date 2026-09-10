import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Icon } from '@/components/ui/Icon';
import { MapboxNavigation } from '@/components/navigation/MapboxNavigation';
import { RouteOverview } from '@/components/navigation/RouteOverview';
import { Button } from '@/components/ui/Button';

import { getRoute, type RouteResult } from '@/services/routing';
import { isVoiceEnabled, setVoiceEnabled } from '@/services/voiceGuidance';
import { useMissionById } from '@/stores/useMissionStore';
import { chargerHub } from '@/services/hubs';
import { etapeANaviguer } from '@/utils/destinationNavigation';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';

type NavState = 'loading' | 'overview' | 'navigating' | 'arrived' | 'error';

// 🔴 `HUB_COORDS` A DISPARU : six identifiants de démonstration, et un repli sur
// la gare de Cannes pour tout le reste — donc pour TOUTES les vraies missions.
// Voir `utils/destinationNavigation.ts`. Seule la démonstration garde un point
// fixe, parce qu'elle n'a pas de hub.
const DEMO_DESTINATION = { lat: 43.5524, lng: 7.0170 };

export default function NavigateScreen() {
  const { missionId, dest } = useLocalSearchParams<{ missionId: string; dest?: string }>();
  const router = useRouter();
  const { colors } = useColorScheme();
  const isDemo = missionId === 'demo';
  // ⚠️ UN CROCHET, PAS `getMissionById()` : voir `useMissionStore`.
  const trouvee = useMissionById(missionId);
  const mission = isDemo ? null : trouvee;
  const etape = mission ? etapeANaviguer(mission.status, dest) : null;

  const [state, setState] = useState<NavState>('loading');
  const [routeData, setRouteData] = useState<RouteResult | null>(null);
  const [origin, setOrigin] = useState<{ latitude: number; longitude: number } | null>(null);
  const [voiceOn] = useState(isVoiceEnabled());
  const [error, setError] = useState('');
  const [navigatingAway, setNavigatingAway] = useState(false);

  const pendingNavRef = useRef<null | (() => void)>(null);

  const destHub = isDemo
    ? { id: '', name: 'Gare de Cannes', city: 'Cannes', scheduledTime: '', toleranceMinutes: 10, isOffHub: false }
    : mission && etape
      ? etape === 'pickup' ? mission.pickupHub : mission.deliveryHub
      : null;
  const hubName = destHub?.name ?? '';

  // 🔴 LE POINT VIENT DE L'ANNUAIRE, PAR L'IDENTIFIANT QUE LA MISSION PORTE.
  // `undefined` = en cours de lecture ; `null` = introuvable.
  const [pointHub, setPointHub] = useState<{ lat: number; lng: number } | null | undefined>(undefined);
  const hubId = !isDemo && destHub && !destHub.isOffHub ? destHub.id : '';
  useEffect(() => {
    if (!hubId) return;
    let vivant = true;
    chargerHub(hubId)
      .then((h) => { if (vivant) setPointHub(h ? h.point : null); })
      .catch((e) => {
        console.error('[navigation] hub illisible', e);
        if (vivant) setPointHub(null);
      });
    return () => { vivant = false; };
  }, [hubId]);
  const destCoords = isDemo ? DEMO_DESTINATION : pointHub ?? null;

  // ─── INIT ──────────────────────────────────────────────────
  // ⚠️ ATTEND LE POINT DU HUB : il arrive après une lecture. L'ancienne version
  // démarrait au montage, sur des coordonnées déjà « connues » — celles de Cannes.
  const pret = isDemo || pointHub !== undefined || !hubId;
  useEffect(() => {
    if (!pret) return;
    if (!isDemo && !mission) { setError('Co-livraison introuvable'); setState('error'); return; }
    if (!isDemo && !etape) { setError('Cette co-livraison n’a plus de rendez-vous à rejoindre.'); setState('error'); return; }
    if (!isDemo && destHub?.isOffHub) {
      // Hors hub, le lieu est une adresse convenue entre les parties, sans
      // épingle : on ne guide pas vers un point qu'on n'a pas.
      setError(`Rendez-vous hors hub${destHub.offHubAddress ? ` : ${destHub.offHubAddress}` : ''}. Aucun point à rejoindre sur la carte.`);
      setState('error');
      return;
    }
    if (!destCoords) { setError('Le point du hub est introuvable.'); setState('error'); return; }

    if (isDemo) {
      const demoOrigin = { latitude: 43.7046, longitude: 7.2620 };
      setOrigin(demoOrigin);
      setRouteData(getDemoRoute());
      setState('overview');
      return;
    }

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') { setError('Permission de localisation requise.'); setState('error'); return; }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        const here = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        setOrigin(here);
        try {
          const route = await getRoute(here, { latitude: destCoords.lat, longitude: destCoords.lng });
          setRouteData(route);
        } catch {
          // Overview falls back to a straight-line approximation; Mapbox
          // Navigation will compute its own route when we hit Start.
          setRouteData(buildFallbackRoute(here, destCoords, destHub?.name ?? 'Destination'));
        }
        setState('overview');
      } catch (e: any) {
        setError(e.message ?? 'Erreur de localisation');
        setState('error');
      }
    })();
    // ⚠️ UNE FOIS, QUAND LE POINT EST CONNU — pas à chaque rendu : l'itinéraire
    // se calcule une fois, la navigation Mapbox recalcule d'elle-même ensuite.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pret]);

  // ─── START NAVIGATION ──────────────────────────────────────
  const startNavigation = useCallback(() => {
    if (!origin || !destCoords) return;
    setState('navigating');
  }, [origin, destCoords]);

  // Stable JS identities for the native MapboxNavigationView. Without these,
  // every parent re-render hands the native bridge a fresh coordinates array,
  // which restarts the routing session and produces "Two simultaneous active
  // navigation sessions" + a frozen UI.
  const navOrigin = useMemo(
    () => (origin ? { latitude: origin.latitude, longitude: origin.longitude } : null),
    [origin?.latitude, origin?.longitude],
  );
  const navDestination = useMemo(
    () => (destCoords ? { latitude: destCoords.lat, longitude: destCoords.lng } : null),
    [destCoords?.lat, destCoords?.lng],
  );

  // ─── ARRIVAL (from Mapbox SDK) ─────────────────────────────
  const handleArrived = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setState('arrived');
  }, []);

  // Schedule navigation-away (same pattern as before, for MapLibre cleanup).
  const scheduleNavigation = useCallback((action: () => void) => {
    pendingNavRef.current = action;
    setNavigatingAway(true);
  }, []);

  useEffect(() => {
    if (!navigatingAway || !pendingNavRef.current) return;
    const nav = pendingNavRef.current;
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        nav();
        pendingNavRef.current = null;
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [navigatingAway]);

  // ─── CANCEL FROM SDK ───────────────────────────────────────
  const handleCancelFromSDK = useCallback(() => {
    if (isDemo) {
      scheduleNavigation(() => router.back());
      return;
    }
    // In real mode, ask the transporter whether they actually arrived so
    // we can flow directly into the pickup/delivery scan.
    const phaseLabel = etape === 'pickup' ? 'prise en charge' : 'remise';
    const nextPath = etape === 'pickup' ? '/mission/pickup' : '/mission/delivery';

    Alert.alert(
      'Êtes-vous arrivé ?',
      `Si oui, nous enchaînons sur l'étape de ${phaseLabel}.`,
      [
        { text: 'Pas encore', style: 'cancel' },
        { text: 'Retour au suivi', onPress: () => scheduleNavigation(() => router.back()) },
        {
          text: 'Oui, je suis arrivé',
          style: 'default',
          onPress: () =>
            scheduleNavigation(() => {
              if (mission) {
                router.replace({ pathname: nextPath as any, params: { id: mission.id } });
              } else {
                router.back();
              }
            }),
        },
      ],
    );
  }, [isDemo, mission, etape, scheduleNavigation, router]);

  // ─── RENDER ────────────────────────────────────────────────

  if (navigatingAway) {
    return <View style={[s.screen, { backgroundColor: colors.background }]} />;
  }

  if (!isDemo && !mission) {
    return <ErrorView message="Co-livraison introuvable" colors={colors} />;
  }

  if (state === 'loading') {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <Icon name="navigate" size={48} color={colors.primary} />
        <Text style={[s.loadingText, { color: colors.textSecondary }]}>Calcul de l’itinéraire...</Text>
      </View>
    );
  }

  if (state === 'error') {
    return <ErrorView message={error} colors={colors} />;
  }

  if (state === 'overview' && routeData && origin) {
    return (
      <View style={[s.screen, { backgroundColor: colors.background }]}>
        <MapPreview
          routeGeometry={routeData.geometry}
          userLocation={origin}
          destinationCoords={destCoords}
          isDark={colors.background === '#1A1A1E'}
        />
        <RouteOverview
          route={routeData}
          originName={isDemo ? 'Gare de Nice-Ville' : 'Votre position'}
          destinationName={hubName}
          destinationCoords={destCoords ?? undefined}
          onStart={startNavigation}
          onCancel={() => router.back()}
        />
      </View>
    );
  }

  if (state === 'arrived') {
    return (
      <Animated.View entering={FadeIn.duration(400)} style={[s.arrivalOverlay, { backgroundColor: 'rgba(0,0,0,0.8)' }]}>
        <View style={s.arrivalContent}>
          <Icon name="location-filled" size={56} color="#10B981" />
          <Text style={s.arrivalTitle}>Vous êtes arrivé !</Text>
          <Text style={s.arrivalHub}>{hubName}</Text>
          <Text style={s.arrivalWarm}>Tout est prêt pour la remise. Bonne continuation !</Text>
          <Button
            title={isDemo ? 'Terminer la démo' : 'Continuer vers la co-livraison'}
            onPress={() => {
              if (isDemo || !mission) {
                scheduleNavigation(() => router.back());
                return;
              }
              const nextPath = etape === 'pickup' ? '/mission/pickup' : '/mission/delivery';
              scheduleNavigation(() =>
                router.replace({ pathname: nextPath as any, params: { id: mission.id } }),
              );
            }}
            variant="gradient"
            style={{ minHeight: 52, marginTop: Spacing.xl }}
          />
        </View>
      </Animated.View>
    );
  }

  // ─── NAVIGATING: real Mapbox Navigation SDK ────────────────
  if (state === 'navigating' && navOrigin && navDestination) {
    return (
      <MapboxNavigation
        origin={navOrigin}
        destination={navDestination}
        voiceEnabled={voiceOn}
        onArrived={handleArrived}
        onCancel={handleCancelFromSDK}
      />
    );
  }

  return null;
}

function ErrorView({ message, colors }: { message: string; colors: any }) {
  const router = useRouter();
  return (
    <View style={[s.center, { backgroundColor: colors.background }]}>
      <Icon name="alert-circle" size={48} color={colors.error} />
      <Text style={[s.errorText, { color: colors.error }]}>{message}</Text>
      <Button title="Retour" onPress={() => router.back()} variant="outline" fullWidth={false} />
    </View>
  );
}

// ─── Fallback route for the PREVIEW only — SDK recomputes at Start ──
function buildFallbackRoute(
  origin: { latitude: number; longitude: number },
  destination: { lat: number; lng: number },
  destinationName: string,
): RouteResult {
  const steps = 24;
  const geometry: [number, number][] = [];
  const dLng = destination.lng - origin.longitude;
  const dLat = destination.lat - origin.latitude;
  const norm = Math.sqrt(dLng * dLng + dLat * dLat) || 1;
  const perpLng = -dLat / norm;
  const perpLat = dLng / norm;
  const amplitude = norm * 0.015;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const wobble = Math.sin(t * Math.PI * 2) * amplitude;
    geometry.push([
      origin.longitude + dLng * t + perpLng * wobble,
      origin.latitude + dLat * t + perpLat * wobble,
    ]);
  }

  const R = 6371000;
  const hLat = ((destination.lat - origin.latitude) * Math.PI) / 180;
  const hLon = ((destination.lng - origin.longitude) * Math.PI) / 180;
  const a =
    Math.sin(hLat / 2) ** 2 +
    Math.cos((origin.latitude * Math.PI) / 180) *
      Math.cos((destination.lat * Math.PI) / 180) *
      Math.sin(hLon / 2) ** 2;
  const distM = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const durS = Math.max(60, Math.round((distM / 1000 / 50) * 3600));

  return {
    distance: distM,
    duration: durS,
    geometry,
    steps: [
      {
        instruction: `Dirigez-vous vers ${destinationName}`,
        distance: Math.max(1, Math.round(distM)),
        duration: Math.max(1, durS),
        maneuver: { type: 'depart', location: geometry[0], bearing_after: 0 },
        name: 'Itinéraire',
        geometry,
      },
      {
        instruction: `Vous êtes arrivé à ${destinationName}`,
        distance: 0,
        duration: 0,
        maneuver: { type: 'arrive', location: geometry[geometry.length - 1], bearing_after: 0 },
        name: destinationName,
        geometry: [geometry[geometry.length - 1]],
      },
    ],
  };
}

// ─── Detailed demo route: Nice → Cannes via A8 ─────────────
function getDemoRoute(): RouteResult {
  const geometry: [number, number][] = [
    [7.2620, 43.7046], [7.2580, 43.7030], [7.2500, 43.7010], [7.2400, 43.6980],
    [7.2200, 43.6920], [7.1800, 43.6750], [7.1400, 43.6600], [7.1100, 43.6450],
    [7.0800, 43.6280], [7.0600, 43.6100], [7.0400, 43.5900], [7.0250, 43.5700],
    [7.0200, 43.5600], [7.0170, 43.5524],
  ];
  const steps: RouteResult['steps'] = [
    { instruction: 'Dirigez-vous vers A8', distance: 400, duration: 60, maneuver: { type: 'depart', location: geometry[0], bearing_after: 270 }, name: 'Avenue Thiers', geometry: [geometry[0], geometry[1]] },
    { instruction: 'Continuez sur A8 direction Cannes', distance: 22000, duration: 900, maneuver: { type: 'continue', modifier: 'straight', location: geometry[3], bearing_after: 240 }, name: 'A8', geometry: geometry.slice(3, 11) },
    { instruction: 'Vous êtes arrivé', distance: 0, duration: 0, maneuver: { type: 'arrive', location: geometry[13], bearing_after: 0 }, name: 'Gare de Cannes', geometry: [geometry[13]] },
  ];
  return { distance: 28000, duration: 1350, geometry, steps };
}

function MapPreview({ isDark }: {
  routeGeometry: [number, number][];
  userLocation: { latitude: number; longitude: number } | null;
  destinationCoords: { lat: number; lng: number } | null;
  isDark: boolean;
}) {
  return (
    <View style={[s.previewFallback, { backgroundColor: isDark ? '#1A1A1E' : '#F3F4F6' }]}>
      <Icon name="map-overview" size={32} color={isDark ? '#6B7280' : '#9CA3AF'} />
    </View>
  );
}

// Silence unused voice-toggle import (kept so header stub stays stable)
void setVoiceEnabled;

const s = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg, padding: Spacing.xxl },
  loadingText: { ...Typography.body },
  errorText: { ...Typography.body, textAlign: 'center' },
  arrivalOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  arrivalContent: { alignItems: 'center', paddingHorizontal: Spacing.xxxl, gap: Spacing.md },
  arrivalTitle: { fontFamily: 'Poppins_700Bold', fontSize: 24, color: '#FFFFFF', textAlign: 'center' },
  arrivalHub: { fontFamily: 'Poppins_500Medium', fontSize: 16, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  arrivalWarm: { fontFamily: 'Poppins_400Regular', fontSize: 14, color: 'rgba(255,255,255,0.6)', textAlign: 'center', fontStyle: 'italic' },
  previewFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
