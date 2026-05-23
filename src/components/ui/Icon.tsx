/**
 * Centralized icon component using @expo/vector-icons.
 * Maps semantic icon names to Ionicons/MaterialCommunityIcons.
 * NO emojis or text icons anywhere — all vector-based.
 */

import React from 'react';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

type IconName = keyof typeof ICON_MAP;

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
}

const ICON_MAP = {
  // ─── Tabs ───
  'tab-home': { set: 'ion', name: 'home' },
  'tab-home-outline': { set: 'ion', name: 'home-outline' },
  'tab-routes': { set: 'ion', name: 'map' },
  'tab-routes-outline': { set: 'ion', name: 'map-outline' },
  'tab-missions': { set: 'ion', name: 'cube' },
  'tab-missions-outline': { set: 'ion', name: 'cube-outline' },
  'tab-profile': { set: 'ion', name: 'person' },
  'tab-profile-outline': { set: 'ion', name: 'person-outline' },
  'tab-messages': { set: 'ion', name: 'chatbubbles' },
  'tab-messages-outline': { set: 'ion', name: 'chatbubbles-outline' },

  // ─── Navigation / Actions ───
  'bell': { set: 'ion', name: 'notifications-outline' },
  'bell-filled': { set: 'ion', name: 'notifications' },
  'plus': { set: 'ion', name: 'add' },
  'back': { set: 'ion', name: 'chevron-back' },
  'chevron-down': { set: 'ion', name: 'chevron-down' },
  'chevron-right': { set: 'ion', name: 'chevron-forward' },
  'close': { set: 'ion', name: 'close' },
  'search': { set: 'ion', name: 'search-outline' },
  'settings': { set: 'ion', name: 'settings-outline' },
  'camera': { set: 'ion', name: 'camera-outline' },
  'flashlight': { set: 'ion', name: 'flashlight-outline' },
  'flashlight-on': { set: 'ion', name: 'flashlight' },

  // ─── Status ───
  'checkmark': { set: 'ion', name: 'checkmark' },
  'checkmark-circle': { set: 'ion', name: 'checkmark-circle' },
  'close-circle': { set: 'ion', name: 'close-circle' },
  'alert-circle': { set: 'ion', name: 'alert-circle' },
  'time': { set: 'ion', name: 'time-outline' },
  'hourglass': { set: 'ion', name: 'hourglass-outline' },
  'lock': { set: 'ion', name: 'lock-closed-outline' },

  // ─── Mission / Delivery ───
  'package': { set: 'mat', name: 'package-variant' },
  'package-open': { set: 'mat', name: 'package-variant-closed' },
  'qr-scan': { set: 'ion', name: 'qr-code-outline' },
  'keypad': { set: 'ion', name: 'keypad-outline' },
  'navigate': { set: 'ion', name: 'navigate-outline' },
  'navigate-filled': { set: 'ion', name: 'navigate' },
  'location': { set: 'ion', name: 'location-outline' },
  'location-filled': { set: 'ion', name: 'location' },
  'flag': { set: 'ion', name: 'flag-outline' },
  'trophy': { set: 'ion', name: 'trophy-outline' },

  // ─── Transport ───
  'walk': { set: 'mat', name: 'walk' },
  'bike': { set: 'mat', name: 'bicycle' },
  'scooter': { set: 'mat', name: 'moped' },
  'moto': { set: 'mat', name: 'motorbike' },
  'car': { set: 'ion', name: 'car-outline' },
  'utilitaire': { set: 'mat', name: 'van-utility' },
  'bus': { set: 'ion', name: 'bus-outline' },
  'train': { set: 'mat', name: 'train' },

  // ─── Hub Types ───
  'hub-gare': { set: 'mat', name: 'train-variant' },
  'hub-bus': { set: 'ion', name: 'bus' },
  'hub-highway': { set: 'mat', name: 'highway' },
  'hub-shopping': { set: 'ion', name: 'cart-outline' },
  'hub-partner': { set: 'ion', name: 'storefront-outline' },
  'hub-locker': { set: 'mat', name: 'locker' },
  'hub-relay': { set: 'ion', name: 'pin-outline' },

  // ─── Finance ───
  'wallet': { set: 'ion', name: 'wallet-outline' },
  'cash': { set: 'ion', name: 'cash-outline' },
  'card': { set: 'ion', name: 'card-outline' },
  'trending-up': { set: 'ion', name: 'trending-up' },
  'trending-down': { set: 'ion', name: 'trending-down' },

  // ─── Communication ───
  'chat': { set: 'ion', name: 'chatbubble-outline' },
  'send': { set: 'ion', name: 'send-outline' },
  'call': { set: 'ion', name: 'call-outline' },

  // ─── Misc ───
  'star': { set: 'ion', name: 'star' },
  'star-outline': { set: 'ion', name: 'star-outline' },
  'heart': { set: 'ion', name: 'heart-outline' },
  'heart-filled': { set: 'ion', name: 'heart' },
  'info': { set: 'ion', name: 'information-circle-outline' },
  'help': { set: 'ion', name: 'help-circle-outline' },
  'clipboard': { set: 'ion', name: 'clipboard-outline' },
  'document': { set: 'ion', name: 'document-text-outline' },
  'history': { set: 'ion', name: 'time-outline' },
  'refresh': { set: 'ion', name: 'refresh-outline' },
  'volume-on': { set: 'ion', name: 'volume-high-outline' },
  'volume-off': { set: 'ion', name: 'volume-mute-outline' },
  'compass': { set: 'ion', name: 'compass-outline' },
  'map-overview': { set: 'ion', name: 'map-outline' },
  'arrow-up': { set: 'ion', name: 'arrow-up' },
  'arrow-forward': { set: 'ion', name: 'arrow-forward' },
  'swap': { set: 'ion', name: 'swap-horizontal' },
  'shield': { set: 'ion', name: 'shield-checkmark-outline' },
  'rocket': { set: 'ion', name: 'rocket-outline' },
  'happy': { set: 'ion', name: 'happy-outline' },
  'calendar': { set: 'ion', name: 'calendar-outline' },
  'repeat': { set: 'ion', name: 'repeat-outline' },
  'pin-single': { set: 'mat', name: 'map-marker' },
  'logout': { set: 'ion', name: 'log-out-outline' },
  'moon': { set: 'ion', name: 'moon-outline' },
  'globe': { set: 'ion', name: 'globe-outline' },
  'person-add': { set: 'ion', name: 'person-add-outline' },
  'notifications': { set: 'ion', name: 'notifications-outline' },
  'envelope': { set: 'ion', name: 'mail-outline' },
  'battery': { set: 'mat', name: 'battery-charging-high' },
  'traffic': { set: 'mat', name: 'traffic-light-outline' },
  'video': { set: 'ion', name: 'videocam' },
  'video-off': { set: 'ion', name: 'videocam-off' },
  'phone-down': { set: 'mat', name: 'phone-hangup' },
  'mic': { set: 'ion', name: 'mic' },
  'mic-off': { set: 'ion', name: 'mic-off' },
  'speaker': { set: 'ion', name: 'volume-high' },
  'speaker-off': { set: 'ion', name: 'volume-mute' },
  'photo': { set: 'ion', name: 'images' },
  'pin': { set: 'ion', name: 'location' },
  'leaf': { set: 'ion', name: 'leaf' },
  'tree': { set: 'mat', name: 'tree-outline' },

  // ─── Turn-by-turn ───
  'turn-left': { set: 'mat', name: 'arrow-left-top' },
  'turn-right': { set: 'mat', name: 'arrow-right-top' },
  'straight': { set: 'mat', name: 'arrow-up' },
  'roundabout': { set: 'mat', name: 'rotate-right' },
  'merge': { set: 'mat', name: 'call-merge' },
  'arrival': { set: 'ion', name: 'flag' },
  'depart': { set: 'ion', name: 'navigate' },
} as const;

export function Icon({ name, size = 24, color = '#000' }: IconProps) {
  const config = ICON_MAP[name];
  if (!config) return null;

  switch (config.set) {
    case 'ion':
      return <Ionicons name={config.name as any} size={size} color={color} />;
    case 'mat':
      return <MaterialCommunityIcons name={config.name as any} size={size} color={color} />;
    default:
      return null;
  }
}

export type { IconName };
