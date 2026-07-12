import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Line, G } from 'react-native-svg';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useTranslation } from '@/hooks/useTranslation';
import { hubZoneDiameterM, hubZoneRadiusM } from '@/constants/hubZone';
import { Typography } from '@/constants/Typography';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import type { Hub } from '@/types/hub';

/**
 * Top-down schematic of a hub's meeting zone — the graceful fallback used while
 * react-native-maps is not installed in this app. Same visual grammar as a real
 * map (Circle = zone, marker = point central, dot = user), so it can be swapped
 * for a MapView + Circle + Marker later without changing callers.
 */
interface HubZoneMapProps {
  hub: Hub;
  /** Live user position (from useHubPresence). Omit to hide the user dot. */
  userCoords?: { latitude: number; longitude: number } | null;
  inZone?: boolean;
}

const VIEW = 240;
const CENTER = VIEW / 2;
const ZONE_R = 88; // px radius drawn for the zone
const MAX_R = 108; // outer clamp so the user dot stays on-canvas
const METERS_PER_DEG_LAT = 111_320;

function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
}

export function HubZoneMap({ hub, userCoords, inZone = false }: HubZoneMapProps) {
  const { colors } = useColorScheme();
  const { t } = useTranslation();

  const diameter = hubZoneDiameterM(hub);
  const radiusM = hubZoneRadiusM(hub);
  const metersPerPx = radiusM / ZONE_R;
  const label = hub.centralPointLabel ?? t('zone.centralPointDefault');
  const userColor = inZone ? colors.success : colors.warning;

  // Project the user's offset (north/east metres from the point central) onto the
  // canvas; clamp to MAX_R so an out-of-zone dot stays visible at the ring edge.
  let userPx: { x: number; y: number } | null = null;
  if (userCoords) {
    const northM = (userCoords.latitude - hub.latitude) * METERS_PER_DEG_LAT;
    const eastM =
      (userCoords.longitude - hub.longitude) * METERS_PER_DEG_LAT * Math.cos((hub.latitude * Math.PI) / 180);
    let x = CENTER + eastM / metersPerPx;
    let y = CENTER - northM / metersPerPx;
    const d = Math.hypot(x - CENTER, y - CENTER);
    if (d > MAX_R) {
      const k = MAX_R / d;
      x = CENTER + (x - CENTER) * k;
      y = CENTER + (y - CENTER) * k;
    }
    userPx = { x, y };
  }

  return (
    <View style={s.wrap}>
      <View style={s.canvas}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${VIEW} ${VIEW}`}>
          {/* faint outer field */}
          <Circle cx={CENTER} cy={CENTER} r={MAX_R} fill={colors.primary + '08'} />
          {/* cross-hairs */}
          <G opacity={0.35}>
            <Line x1={CENTER} y1={CENTER - MAX_R} x2={CENTER} y2={CENTER + MAX_R} stroke={colors.border} strokeWidth={1} />
            <Line x1={CENTER - MAX_R} y1={CENTER} x2={CENTER + MAX_R} y2={CENTER} stroke={colors.border} strokeWidth={1} />
          </G>
          {/* the meeting zone */}
          <Circle
            cx={CENTER}
            cy={CENTER}
            r={ZONE_R}
            fill={colors.primary + (inZone ? '22' : '12')}
            stroke={colors.primary}
            strokeWidth={2}
            strokeDasharray="6 5"
          />
          {/* user position dot */}
          {userPx && (
            <G>
              <Circle cx={userPx.x} cy={userPx.y} r={13} fill={userColor + '33'} />
              <Circle cx={userPx.x} cy={userPx.y} r={7} fill={userColor} stroke="#FFFFFF" strokeWidth={2} />
            </G>
          )}
          {/* point central marker (drawn last → on top) */}
          <G>
            <Circle cx={CENTER} cy={CENTER} r={10} fill={colors.primary + '30'} />
            <Circle cx={CENTER} cy={CENTER} r={5.5} fill={colors.primary} stroke="#FFFFFF" strokeWidth={2} />
          </G>
        </Svg>
      </View>

      {/* Marker / circle "callouts" as captions (readable outside the SVG). */}
      <View style={s.legend}>
        <View style={s.legendRow}>
          <View style={[s.dot, { backgroundColor: colors.primary }]} />
          <Text style={[s.legendText, { color: colors.textSecondary }]} numberOfLines={1}>
            {fill(t('zone.mapPointCentral'), { label })}
          </Text>
        </View>
        <View style={s.legendRow}>
          <View style={[s.dot, { backgroundColor: colors.primary + '55' }]} />
          <Text style={[s.legendText, { color: colors.textSecondary }]} numberOfLines={1}>
            {fill(t('zone.mapZoneLabel'), { diameter })}
          </Text>
        </View>
        {userCoords && (
          <View style={s.legendRow}>
            <View style={[s.dot, { backgroundColor: userColor }]} />
            <Text style={[s.legendText, { color: colors.textSecondary }]} numberOfLines={1}>
              {t('zone.youLabel')}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: Spacing.sm },
  canvas: {
    width: '100%',
    aspectRatio: 1,
    maxWidth: 260,
    alignSelf: 'center',
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  legend: { gap: 4 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { ...Typography.caption, flex: 1 },
});
