/**
 * Navigation Simulator for demo/dev mode.
 * Simulates movement along a route geometry at configurable speed.
 */

type LocationCallback = (lat: number, lng: number, bearing: number) => void;

const DEFAULT_SPEED_KMH = 50;
const TICK_MS = 1000;

interface SimulatorOptions {
  geometry: [number, number][]; // [[lng, lat], ...]
  speedKmh?: number;
  onLocationUpdate: LocationCallback;
  onComplete: () => void;
}

let timer: ReturnType<typeof setInterval> | null = null;
// Mutable so setSimulationSpeed() can update it live without restarting.
let currentSpeedKmh = DEFAULT_SPEED_KMH;

/**
 * Start simulating movement along the route.
 */
export function startSimulation({ geometry, speedKmh = DEFAULT_SPEED_KMH, onLocationUpdate, onComplete }: SimulatorOptions): void {
  stopSimulation();
  currentSpeedKmh = speedKmh;

  if (geometry.length < 2) {
    onComplete();
    return;
  }

  let currentIndex = 0;
  let progressAlongSegment = 0; // 0..1 within current segment

  timer = setInterval(() => {
    const metersPerTick = (currentSpeedKmh * 1000) / 3600; // meters per second at TICK_MS=1000

    if (currentIndex >= geometry.length - 1) {
      stopSimulation();
      // Final position
      const [lng, lat] = geometry[geometry.length - 1];
      onLocationUpdate(lat, lng, 0);
      onComplete();
      return;
    }

    const [lng1, lat1] = geometry[currentIndex];
    const [lng2, lat2] = geometry[currentIndex + 1];

    // Segment distance
    const segDist = haversine(lat1, lng1, lat2, lng2);
    const segProgress = segDist > 0 ? metersPerTick / segDist : 1;
    progressAlongSegment += segProgress;

    if (progressAlongSegment >= 1) {
      // Move to next segment
      currentIndex++;
      progressAlongSegment = 0;
      if (currentIndex < geometry.length) {
        const [lng, lat] = geometry[currentIndex];
        const bearing = currentIndex < geometry.length - 1
          ? calcBearing(lat, lng, geometry[currentIndex + 1][1], geometry[currentIndex + 1][0])
          : 0;
        onLocationUpdate(lat, lng, bearing);
      }
    } else {
      // Interpolate position
      const lat = lat1 + (lat2 - lat1) * progressAlongSegment;
      const lng = lng1 + (lng2 - lng1) * progressAlongSegment;
      const bearing = calcBearing(lat1, lng1, lat2, lng2);
      onLocationUpdate(lat, lng, bearing);
    }
  }, TICK_MS);
}

/**
 * Adjust the simulation speed while it's running.
 * Takes effect on the next tick (max ~1s lag).
 */
export function setSimulationSpeed(speedKmh: number): void {
  currentSpeedKmh = Math.max(1, speedKmh);
}

/**
 * Stop simulation.
 */
export function stopSimulation(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calcBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180);
  const x = Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) - Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}
