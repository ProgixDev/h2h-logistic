import React, { useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapLibreGL from '@maplibre/maplibre-react-native';
import { InstructionBar } from './InstructionBar';
import { NavigationFooter } from './NavigationFooter';
import { Spacing } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';
import type { RouteStep } from '@/services/routing';

// Free tile style — no API key needed
const MAP_STYLE_LIGHT = 'https://tiles.openfreemap.org/styles/liberty';
const MAP_STYLE_DARK = 'https://tiles.openfreemap.org/styles/dark';

// Initialize MapLibre (no token needed for open-source renderer)
MapLibreGL.setAccessToken(null);

interface NavigationViewProps {
  currentStep: RouteStep | null;
  nextStep: RouteStep | null;
  distanceToNext: number;
  remainingDistance: number;
  remainingDuration: number;
  hubName: string;
  voiceEnabled: boolean;
  onToggleVoice: () => void;
  onStop: () => void;
  userLocation?: { latitude: number; longitude: number } | null;
  routeGeometry?: [number, number][];
  destinationCoords?: { lat: number; lng: number };
  bearing?: number;
}

export function NavigationView({
  currentStep,
  nextStep,
  distanceToNext,
  remainingDistance,
  remainingDuration,
  hubName,
  voiceEnabled,
  onToggleVoice,
  onStop,
  userLocation,
  routeGeometry,
  destinationCoords,
  bearing = 0,
}: NavigationViewProps) {
  const { isDark, colors } = useColorScheme();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<any>(null);

  // Follow user location with bearing aligned to direction of travel
  useEffect(() => {
    if (userLocation && cameraRef.current) {
      cameraRef.current.setCamera({
        centerCoordinate: [userLocation.longitude, userLocation.latitude],
        zoomLevel: 16,
        pitch: 60,
        heading: bearing,
        animationDuration: 600,
      });
    }
  }, [userLocation, bearing]);

  // Route GeoJSON
  const routeGeoJSON = routeGeometry && routeGeometry.length > 1 ? {
    type: 'FeatureCollection' as const,
    features: [{
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'LineString' as const,
        coordinates: routeGeometry,
      },
    }],
  } : null;

  const mapStyle = isDark ? MAP_STYLE_DARK : MAP_STYLE_LIGHT;
  const center = userLocation
    ? [userLocation.longitude, userLocation.latitude]
    : [7.2620, 43.7046]; // Nice default

  return (
    <View style={styles.container}>
      {/* MapLibre Map */}
      <MapLibreGL.MapView
        style={styles.map}
        mapStyle={mapStyle}
        compassEnabled={false}
        logoEnabled={false}
        attributionEnabled={false}
      >
        <MapLibreGL.Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: center as [number, number],
            zoomLevel: 14,
            pitch: 50,
          }}
        />

        {/* Route line */}
        {routeGeoJSON && (
          <MapLibreGL.ShapeSource id="routeLine" shape={routeGeoJSON}>
            {/* Shadow line */}
            <MapLibreGL.LineLayer
              id="routeLineShadow"
              style={{
                lineColor: '#00000030',
                lineWidth: 10,
                lineBlur: 4,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            {/* Main route line */}
            <MapLibreGL.LineLayer
              id="routeLineMain"
              style={{
                lineColor: '#14248A',
                lineWidth: 6,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </MapLibreGL.ShapeSource>
        )}

        {/* User position */}
        {userLocation && (
          <MapLibreGL.PointAnnotation
            id="userPos"
            coordinate={[userLocation.longitude, userLocation.latitude]}
          >
            <View style={styles.userDot}>
              <View style={styles.userDotInner} />
            </View>
          </MapLibreGL.PointAnnotation>
        )}

        {/* Destination marker */}
        {destinationCoords && (
          <MapLibreGL.PointAnnotation
            id="destination"
            coordinate={[destinationCoords.lng, destinationCoords.lat]}
          >
            <View style={styles.destMarker}>
              <View style={styles.destMarkerInner} />
            </View>
          </MapLibreGL.PointAnnotation>
        )}
      </MapLibreGL.MapView>

      {/* Instruction bar overlay (top) */}
      <View style={[styles.instructionOverlay, { top: insets.top + Spacing.sm }]}>
        <InstructionBar
          currentStep={currentStep}
          nextStep={nextStep}
          distanceToNext={distanceToNext}
        />
      </View>

      {/* Footer overlay (bottom) */}
      <View style={styles.footerOverlay}>
        <NavigationFooter
          remainingDistance={remainingDistance}
          remainingDuration={remainingDuration}
          hubName={hubName}
          voiceEnabled={voiceEnabled}
          onToggleVoice={onToggleVoice}
          onStop={onStop}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  // User position dot
  userDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(20, 36, 138, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDotInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#14248A',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
  // Destination marker
  destMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  destMarkerInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  instructionOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 10,
  },
  footerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
});
