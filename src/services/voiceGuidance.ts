/**
 * Voice Guidance Service using expo-speech.
 * French voice navigation instructions.
 */

import * as Speech from 'expo-speech';
import type { RouteStep } from '@/services/routing';

let voiceEnabled = true;
let currentlySpeaking = false;

export function setVoiceEnabled(enabled: boolean) {
  voiceEnabled = enabled;
  if (!enabled) Speech.stop();
}

export function isVoiceEnabled(): boolean {
  return voiceEnabled;
}

/**
 * Speak text in French.
 */
export async function speak(text: string): Promise<void> {
  if (!voiceEnabled) return;
  if (currentlySpeaking) await Speech.stop();

  currentlySpeaking = true;
  Speech.speak(text, {
    language: 'fr-FR',
    rate: 0.95,
    pitch: 1.0,
    onDone: () => { currentlySpeaking = false; },
    onError: () => { currentlySpeaking = false; },
  });
}

/**
 * Announce a step based on distance.
 * Called continuously — internally debounces to only speak at 200m and 50m.
 */
const announced = new Set<string>();

export function announceStep(step: RouteStep, distanceToStep: number): void {
  if (!voiceEnabled) return;

  const key200 = `${step.maneuver.location[0]}_200`;
  const key50 = `${step.maneuver.location[0]}_50`;

  if (distanceToStep <= 200 && distanceToStep > 150 && !announced.has(key200)) {
    announced.add(key200);
    speak(`Dans 200 mètres, ${step.instruction.toLowerCase()}`);
  } else if (distanceToStep <= 50 && distanceToStep > 20 && !announced.has(key50)) {
    announced.add(key50);
    speak(step.instruction);
  }
}

/**
 * Reset announcement tracking (call when route changes).
 */
export function resetAnnouncements(): void {
  announced.clear();
}

/**
 * Speak with distance prefix.
 */
export function speakInstruction(instruction: string, distanceMeters?: number): void {
  let text = instruction;
  if (distanceMeters != null && distanceMeters > 20) {
    const distLabel = distanceMeters < 1000
      ? `${Math.round(distanceMeters / 10) * 10} mètres`
      : `${(distanceMeters / 1000).toFixed(1)} kilomètres`;
    text = `Dans ${distLabel}, ${instruction.toLowerCase()}`;
  }
  speak(text);
}

export function speakArrival(hubName: string): void {
  speak(`Vous êtes arrivé au hub ${hubName}. Bonne livraison !`);
}

export function speakRouteStart(hubName: string, durationMinutes: number): void {
  speak(`Navigation démarrée. Direction ${hubName}, arrivée estimée dans ${durationMinutes} minutes.`);
}

export function announceReroute(): void {
  speak('Recalcul de l\'itinéraire en cours.');
}

export function stopSpeech(): void {
  Speech.stop();
  currentlySpeaking = false;
}
