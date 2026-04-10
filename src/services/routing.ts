/**
 * OSRM Routing Service
 * Uses the public OSRM demo server for route calculation.
 * In production, replace with a self-hosted OSRM instance.
 */

const OSRM_BASE = 'https://router.project-osrm.org';

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
  maneuver: {
    type: string;
    modifier?: string;
    location: [number, number]; // [lng, lat]
    bearing_after: number;
  };
  name: string;
  geometry: [number, number][]; // step-level polyline [[lng, lat], ...]
}

export interface RouteResult {
  distance: number;
  duration: number;
  geometry: [number, number][]; // full route [[lng, lat], ...]
  steps: RouteStep[];
}

/**
 * Get driving directions between two coordinates via OSRM.
 */
export async function getRoute(
  origin: Coordinate,
  destination: Coordinate,
): Promise<RouteResult> {
  const url = `${OSRM_BASE}/route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson&steps=true&annotations=true&language=fr`;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`OSRM request failed: ${response.status}`);

  const data = await response.json();
  if (data.code !== 'Ok' || !data.routes?.length) throw new Error('Route not found');

  const route = data.routes[0];
  const leg = route.legs[0];

  const steps: RouteStep[] = leg.steps.map((step: any) => ({
    instruction: step.maneuver.instruction || buildInstruction(step),
    distance: step.distance,
    duration: step.duration,
    maneuver: {
      type: step.maneuver.type,
      modifier: step.maneuver.modifier,
      location: step.maneuver.location,
      bearing_after: step.maneuver.bearing_after ?? 0,
    },
    name: step.name || '',
    geometry: step.geometry?.coordinates ?? [],
  }));

  return {
    distance: route.distance,
    duration: route.duration,
    geometry: route.geometry.coordinates,
    steps,
  };
}

function buildInstruction(step: any): string {
  const type = step.maneuver.type;
  const modifier = step.maneuver.modifier;
  const name = step.name || 'la route';

  if (type === 'depart') return `Dirigez-vous vers ${name}`;
  if (type === 'arrive') return 'Vous êtes arrivé à destination';
  if (type === 'turn') {
    if (modifier === 'left') return `Tournez à gauche sur ${name}`;
    if (modifier === 'right') return `Tournez à droite sur ${name}`;
    if (modifier === 'slight left') return `Tournez légèrement à gauche sur ${name}`;
    if (modifier === 'slight right') return `Tournez légèrement à droite sur ${name}`;
    if (modifier === 'sharp left') return `Tournez fortement à gauche sur ${name}`;
    if (modifier === 'sharp right') return `Tournez fortement à droite sur ${name}`;
    if (modifier === 'straight') return `Continuez tout droit sur ${name}`;
    return `Continuez sur ${name}`;
  }
  if (type === 'continue' || type === 'new name') return `Continuez sur ${name}`;
  if (type === 'merge') return `Insérez-vous sur ${name}`;
  if (type === 'roundabout' || type === 'rotary') return `Au rond-point, prenez la sortie vers ${name}`;
  if (type === 'fork') return modifier === 'left' ? `Gardez la gauche vers ${name}` : `Gardez la droite vers ${name}`;
  if (type === 'end of road') return modifier === 'left' ? `En fin de route, tournez à gauche sur ${name}` : `En fin de route, tournez à droite sur ${name}`;
  return `Continuez sur ${name}`;
}

export function formatRouteDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatRouteDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

export function getETA(durationSeconds: number): string {
  const eta = new Date(Date.now() + durationSeconds * 1000);
  return `${String(eta.getHours()).padStart(2, '0')}:${String(eta.getMinutes()).padStart(2, '0')}`;
}
