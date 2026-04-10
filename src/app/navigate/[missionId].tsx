import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn } from 'react-native-reanimated';
import MapLibreGL from '@maplibre/maplibre-react-native';
import { Icon } from '@/components/ui/Icon';
import { NavigationView } from '@/components/navigation/NavigationView';
import { RouteOverview } from '@/components/navigation/RouteOverview';
import { Button } from '@/components/ui/Button';

MapLibreGL.setAccessToken(null);
import { getRoute, type RouteResult } from '@/services/routing';
import { announceStep, speakArrival, speakRouteStart, announceReroute, resetAnnouncements, stopSpeech, setVoiceEnabled, isVoiceEnabled } from '@/services/voiceGuidance';
import { isNearManeuver, isOffRoute, distanceBetween } from '@/utils/navigationHelpers';
import { startSimulation, stopSimulation } from '@/services/mock/navigationSimulator';
import { useMissionStore } from '@/stores/useMissionStore';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Typography } from '@/constants/Typography';
import { Spacing, BorderRadius } from '@/constants/Spacing';

type NavState = 'loading' | 'overview' | 'navigating' | 'arrived' | 'error';

const HUB_COORDS: Record<string, { lat: number; lng: number }> = {
  'hub-nice-gare': { lat: 43.7046, lng: 7.2620 },
  'hub-nice-tnt': { lat: 43.6947, lng: 7.2659 },
  'hub-nice-etoile': { lat: 43.7010, lng: 7.2700 },
  'hub-cannes-gare': { lat: 43.5524, lng: 7.0170 },
  'hub-mrs-gare': { lat: 43.3026, lng: 5.3806 },
  'hub-antibes-gare': { lat: 43.5844, lng: 7.1197 },
};

const REROUTE_THRESHOLD = 50;
const REROUTE_DELAY = 5000;

export default function NavigateScreen() {
  const { missionId } = useLocalSearchParams<{ missionId: string }>();
  const router = useRouter();
  const { colors } = useColorScheme();
  const insets = useSafeAreaInsets();
  const { getMissionById } = useMissionStore();

  const isDemo = missionId === 'demo';
  const mission = isDemo ? null : getMissionById(missionId ?? '');

  const [state, setState] = useState<NavState>('loading');
  const [routeData, setRouteData] = useState<RouteResult | null>(null);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [userBearing, setUserBearing] = useState(0);
  const [voiceOn, setVoiceOn] = useState(isVoiceEnabled());
  const [error, setError] = useState('');

  const locationSub = useRef<Location.LocationSubscription | null>(null);
  const offRouteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRerouting = useRef(false);
  const stepIdxRef = useRef(0);

  // Destination
  const destHub = isDemo
    ? { id: 'hub-cannes-gare', name: 'Gare de Cannes', city: 'Cannes', scheduledTime: '', toleranceMinutes: 10 }
    : mission
      ? ['pickup_pending', 'group_created'].includes(mission.status) ? mission.pickupHub : mission.deliveryHub
      : null;
  const destCoords = destHub ? HUB_COORDS[destHub.id] ?? { lat: 43.5524, lng: 7.0170 } : null;
  const hubName = destHub?.name ?? 'Gare de Cannes';

  // ─── INIT ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isDemo && !mission) { setError('Mission introuvable'); setState('error'); return; }
    if (!destCoords) { setError('Destination non trouvée'); setState('error'); return; }

    if (isDemo) {
      // Demo: use the detailed Nice → Cannes route
      const route = getDemoRoute();
      setRouteData(route);
      setUserLocation({ latitude: route.geometry[0][1], longitude: route.geometry[0][0] });
      setState('overview');
    } else {
      // Real mode: get GPS + route
      (async () => {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') { setError('Permission de localisation requise.'); setState('error'); return; }
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
          try {
            const route = await getRoute(
              { latitude: loc.coords.latitude, longitude: loc.coords.longitude },
              { latitude: destCoords.lat, longitude: destCoords.lng },
            );
            setRouteData(route);
          } catch {
            setRouteData(getDemoRoute());
          }
          setState('overview');
        } catch (e: any) {
          setError(e.message ?? 'Erreur de localisation');
          setState('error');
        }
      })();
    }

    return () => {
      locationSub.current?.remove();
      stopSimulation();
      stopSpeech();
      if (offRouteTimer.current) clearTimeout(offRouteTimer.current);
    };
  }, []);

  // ─── START NAVIGATION ──────────────────────────────────────
  const startNavigation = useCallback(() => {
    if (!routeData || !destCoords) return;
    setState('navigating');
    resetAnnouncements();
    stepIdxRef.current = 0;
    setCurrentStepIdx(0);

    const durationMins = Math.round(routeData.duration / 60);
    speakRouteStart(hubName, durationMins);

    if (isDemo) {
      // Demo: use simulator instead of real GPS
      startSimulation({
        geometry: routeData.geometry,
        speedKmh: 80,
        onLocationUpdate: (lat, lng, b) => {
          setUserBearing(b);
          handleLocationUpdate(lat, lng);
        },
        onComplete: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          speakArrival(hubName);
          setState('arrived');
        },
      });
    } else {
      // Real GPS tracking
      (async () => {
        locationSub.current = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, distanceInterval: 5, timeInterval: 1000 },
          (loc) => {
            if (loc.coords.heading != null && loc.coords.heading >= 0) {
              setUserBearing(loc.coords.heading);
            }
            handleLocationUpdate(loc.coords.latitude, loc.coords.longitude);
          },
        );
      })();
    }

    if (routeData.steps.length > 0) {
      announceStep(routeData.steps[0], routeData.steps[0].distance);
    }
  }, [routeData, destCoords, isDemo, hubName]);

  // ─── LOCATION UPDATE ───────────────────────────────────────
  const handleLocationUpdate = useCallback((lat: number, lng: number) => {
    setUserLocation({ latitude: lat, longitude: lng });
    const route = routeData;
    if (!route || !destCoords) return;

    const stepIdx = stepIdxRef.current;
    const step = route.steps[stepIdx];
    if (!step) return;

    const [mLon, mLat] = step.maneuver.location;
    const distToManeuver = distanceBetween(lat, lng, mLat, mLon);

    announceStep(step, distToManeuver);

    // Check arrival
    const distToHub = distanceBetween(lat, lng, destCoords.lat, destCoords.lng);
    if (distToHub < 80) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      speakArrival(hubName);
      setState('arrived');
      locationSub.current?.remove();
      stopSimulation();
      return;
    }

    // Step advancement
    if (isNearManeuver(lat, lng, step.maneuver.location, 50)) {
      if (stepIdx < route.steps.length - 1) {
        const nextIdx = stepIdx + 1;
        stepIdxRef.current = nextIdx;
        setCurrentStepIdx(nextIdx);
        const nextStep = route.steps[nextIdx];
        if (nextStep && nextStep.maneuver.type !== 'arrive') {
          announceStep(nextStep, nextStep.distance);
        }
      }
    }

    // Off-route detection (real mode only)
    if (!isDemo && !isRerouting.current && isOffRoute(lat, lng, route.geometry, REROUTE_THRESHOLD)) {
      if (!offRouteTimer.current) {
        offRouteTimer.current = setTimeout(() => {
          handleReroute(lat, lng);
          offRouteTimer.current = null;
        }, REROUTE_DELAY);
      }
    } else if (offRouteTimer.current) {
      clearTimeout(offRouteTimer.current);
      offRouteTimer.current = null;
    }
  }, [routeData, destCoords, isDemo, hubName]);

  // ─── REROUTE ───────────────────────────────────────────────
  const handleReroute = useCallback(async (lat: number, lng: number) => {
    if (!destCoords || isRerouting.current) return;
    isRerouting.current = true;
    announceReroute();
    try {
      const newRoute = await getRoute({ latitude: lat, longitude: lng }, { latitude: destCoords.lat, longitude: destCoords.lng });
      setRouteData(newRoute);
      stepIdxRef.current = 0;
      setCurrentStepIdx(0);
      resetAnnouncements();
    } catch { /* keep current */ }
    isRerouting.current = false;
  }, [destCoords]);

  // ─── STOP ──────────────────────────────────────────────────
  const stopNavigation = useCallback(() => {
    Alert.alert('Arrêter la navigation ?', 'Vous pouvez la reprendre à tout moment.', [
      { text: 'Continuer', style: 'cancel' },
      {
        text: 'Arrêter',
        onPress: () => {
          locationSub.current?.remove();
          stopSimulation();
          stopSpeech();
          router.back();
        },
      },
    ]);
  }, []);

  const toggleVoice = useCallback(() => {
    const v = !voiceOn;
    setVoiceOn(v);
    setVoiceEnabled(v);
  }, [voiceOn]);

  // ─── RENDER ────────────────────────────────────────────────

  if (!isDemo && !mission) {
    return <ErrorView message="Mission introuvable" colors={colors} />;
  }

  if (state === 'loading') {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <Icon name="navigate" size={48} color={colors.primary} />
        <Text style={[s.loadingText, { color: colors.textSecondary }]}>Calcul de l'itinéraire...</Text>
      </View>
    );
  }

  if (state === 'error') {
    return <ErrorView message={error} colors={colors} />;
  }

  if (state === 'overview' && routeData) {
    return (
      <View style={[s.screen, { backgroundColor: colors.background }]}>
        {/* Real MapLibre map preview */}
        <MapPreview
          routeGeometry={routeData.geometry}
          userLocation={userLocation}
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
            title={isDemo ? 'Terminer la démo' : 'Continuer vers la mission'}
            onPress={() => router.back()}
            variant="gradient"
            style={{ minHeight: 52, marginTop: Spacing.xl }}
          />
        </View>
      </Animated.View>
    );
  }

  // ─── NAVIGATING ────────────────────────────────────────────
  const currentStep = routeData?.steps[currentStepIdx] ?? null;
  const nextStep = routeData?.steps[currentStepIdx + 1] ?? null;
  const remainingSteps = routeData?.steps.slice(currentStepIdx) ?? [];
  const remainingDist = remainingSteps.reduce((acc, st) => acc + st.distance, 0);
  const remainingDur = remainingSteps.reduce((acc, st) => acc + st.duration, 0);

  let distToNext = currentStep?.distance ?? 0;
  if (userLocation && currentStep) {
    const [mLon, mLat] = currentStep.maneuver.location;
    distToNext = distanceBetween(userLocation.latitude, userLocation.longitude, mLat, mLon);
  }

  return (
    <NavigationView
      currentStep={currentStep}
      nextStep={nextStep}
      distanceToNext={distToNext}
      remainingDistance={remainingDist}
      remainingDuration={remainingDur}
      hubName={hubName}
      voiceEnabled={voiceOn}
      onToggleVoice={toggleVoice}
      onStop={stopNavigation}
      userLocation={userLocation}
      routeGeometry={routeData?.geometry}
      destinationCoords={destCoords ?? undefined}
      bearing={userBearing}
    />
  );
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

// ─── DETAILED DEMO ROUTE: Nice → Cannes via A8 ─────────────

function getDemoRoute(): RouteResult {
  // Realistic Nice → Cannes route with ~15 points and 8 steps
  const geometry: [number, number][] = [
    [7.2620, 43.7046],   // Nice Gare
    [7.2580, 43.7030],   // Av Thiers heading west
    [7.2500, 43.7010],   // Bd Gambetta
    [7.2400, 43.6980],   // Near A8 on-ramp
    [7.2200, 43.6920],   // A8 Nice Ouest
    [7.1800, 43.6750],   // A8 passing St-Laurent
    [7.1400, 43.6600],   // A8 Cagnes-sur-Mer
    [7.1100, 43.6450],   // A8 Villeneuve-Loubet
    [7.0800, 43.6280],   // A8 Antibes area
    [7.0600, 43.6100],   // A8 passing Biot
    [7.0400, 43.5900],   // A8 Mougins
    [7.0250, 43.5700],   // A8 exit Cannes
    [7.0200, 43.5600],   // Bd Carnot
    [7.0170, 43.5524],   // Cannes Gare
  ];

  const steps: RouteResult['steps'] = [
    {
      instruction: 'Dirigez-vous vers Avenue Thiers en direction de l\'ouest',
      distance: 400,
      duration: 60,
      maneuver: { type: 'depart', location: [7.2620, 43.7046], bearing_after: 270 },
      name: 'Avenue Thiers',
      geometry: [geometry[0], geometry[1]],
    },
    {
      instruction: 'Tournez à gauche sur Boulevard Gambetta',
      distance: 600,
      duration: 90,
      maneuver: { type: 'turn', modifier: 'left', location: [7.2580, 43.7030], bearing_after: 220 },
      name: 'Boulevard Gambetta',
      geometry: [geometry[1], geometry[2]],
    },
    {
      instruction: 'Prenez la sortie vers A8 direction Cannes / Aix-en-Provence',
      distance: 800,
      duration: 60,
      maneuver: { type: 'fork', modifier: 'right', location: [7.2500, 43.7010], bearing_after: 240 },
      name: 'A8 - La Provençale',
      geometry: [geometry[2], geometry[3], geometry[4]],
    },
    {
      instruction: 'Continuez sur l\'A8 direction Cannes',
      distance: 8000,
      duration: 300,
      maneuver: { type: 'continue', modifier: 'straight', location: [7.2200, 43.6920], bearing_after: 240 },
      name: 'A8 - La Provençale',
      geometry: [geometry[4], geometry[5], geometry[6], geometry[7], geometry[8]],
    },
    {
      instruction: 'Restez sur l\'A8',
      distance: 6000,
      duration: 240,
      maneuver: { type: 'new name', location: [7.0800, 43.6280], bearing_after: 230 },
      name: 'A8 - La Provençale',
      geometry: [geometry[8], geometry[9], geometry[10]],
    },
    {
      instruction: 'Prenez la sortie 42 vers Cannes Centre',
      distance: 2000,
      duration: 120,
      maneuver: { type: 'fork', modifier: 'right', location: [7.0400, 43.5900], bearing_after: 200 },
      name: 'Sortie 42 - Cannes',
      geometry: [geometry[10], geometry[11]],
    },
    {
      instruction: 'Tournez à droite sur Boulevard Carnot',
      distance: 1500,
      duration: 180,
      maneuver: { type: 'turn', modifier: 'right', location: [7.0250, 43.5700], bearing_after: 180 },
      name: 'Boulevard Carnot',
      geometry: [geometry[11], geometry[12]],
    },
    {
      instruction: 'Vous êtes arrivé à la Gare de Cannes',
      distance: 0,
      duration: 0,
      maneuver: { type: 'arrive', location: [7.0170, 43.5524], bearing_after: 0 },
      name: 'Gare de Cannes',
      geometry: [geometry[12], geometry[13]],
    },
  ];

  return {
    distance: 28000,
    duration: 1350,
    geometry,
    steps,
  };
}

// ─── Map Preview for Route Overview ──────────────────────────

function MapPreview({
  routeGeometry,
  userLocation,
  destinationCoords,
  isDark,
}: {
  routeGeometry: [number, number][];
  userLocation: { latitude: number; longitude: number } | null;
  destinationCoords: { lat: number; lng: number } | null;
  isDark: boolean;
}) {
  const mapStyle = isDark
    ? 'https://tiles.openfreemap.org/styles/dark'
    : 'https://tiles.openfreemap.org/styles/liberty';

  // Center between user and destination
  const centerLng = userLocation && destinationCoords
    ? (userLocation.longitude + destinationCoords.lng) / 2
    : routeGeometry[Math.floor(routeGeometry.length / 2)]?.[0] ?? 7.15;
  const centerLat = userLocation && destinationCoords
    ? (userLocation.latitude + destinationCoords.lat) / 2
    : routeGeometry[Math.floor(routeGeometry.length / 2)]?.[1] ?? 43.63;

  const routeGeoJSON = {
    type: 'FeatureCollection' as const,
    features: [{
      type: 'Feature' as const,
      properties: {},
      geometry: { type: 'LineString' as const, coordinates: routeGeometry },
    }],
  };

  return (
    <MapLibreGL.MapView
      style={{ flex: 1 }}
      mapStyle={mapStyle}
      compassEnabled={false}
      logoEnabled={false}
      attributionEnabled={false}
    >
      <MapLibreGL.Camera
        defaultSettings={{
          centerCoordinate: [centerLng, centerLat],
          zoomLevel: 10,
        }}
      />
      {/* Route line */}
      <MapLibreGL.ShapeSource id="previewRoute" shape={routeGeoJSON}>
        <MapLibreGL.LineLayer
          id="previewRouteShadow"
          style={{ lineColor: '#00000020', lineWidth: 8, lineBlur: 3, lineCap: 'round', lineJoin: 'round' }}
        />
        <MapLibreGL.LineLayer
          id="previewRouteMain"
          style={{ lineColor: '#14248A', lineWidth: 5, lineCap: 'round', lineJoin: 'round' }}
        />
      </MapLibreGL.ShapeSource>
      {/* Origin dot */}
      {userLocation && (
        <MapLibreGL.PointAnnotation id="previewOrigin" coordinate={[userLocation.longitude, userLocation.latitude]}>
          <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: '#14248A', borderWidth: 2.5, borderColor: '#FFFFFF' }} />
        </MapLibreGL.PointAnnotation>
      )}
      {/* Destination dot */}
      {destinationCoords && (
        <MapLibreGL.PointAnnotation id="previewDest" coordinate={[destinationCoords.lng, destinationCoords.lat]}>
          <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: '#10B981', borderWidth: 2.5, borderColor: '#FFFFFF' }} />
        </MapLibreGL.PointAnnotation>
      )}
    </MapLibreGL.MapView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg, padding: Spacing.xxl },
  loadingText: { ...Typography.body },
  errorText: { ...Typography.body, textAlign: 'center' },
  mapPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  mapText: { ...Typography.body },
  arrivalOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  arrivalContent: { alignItems: 'center', paddingHorizontal: Spacing.xxxl, gap: Spacing.md },
  arrivalTitle: { fontFamily: 'Poppins_700Bold', fontSize: 24, color: '#FFFFFF', textAlign: 'center' },
  arrivalHub: { fontFamily: 'Poppins_500Medium', fontSize: 16, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  arrivalWarm: { fontFamily: 'Poppins_400Regular', fontSize: 14, color: 'rgba(255,255,255,0.6)', textAlign: 'center', fontStyle: 'italic' },
});
