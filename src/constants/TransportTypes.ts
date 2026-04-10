import type { IconName } from '@/components/ui/Icon';

export const TRANSPORT_TYPES = [
  { id: 'walking', label: 'À pied', iconName: 'walk' as IconName, capacity: 'XS-S' },
  { id: 'bike', label: 'Vélo', iconName: 'bike' as IconName, capacity: 'XS-M' },
  { id: 'scooter', label: 'Scooter', iconName: 'scooter' as IconName, capacity: 'XS-M' },
  { id: 'car', label: 'Voiture', iconName: 'car' as IconName, capacity: 'XS-XL' },
  { id: 'bus', label: 'Bus', iconName: 'bus' as IconName, capacity: 'XS-M' },
  { id: 'train', label: 'Train', iconName: 'train' as IconName, capacity: 'XS-L' },
] as const;

export const PACKAGE_SIZES = ['XS', 'S', 'M', 'L', 'XL'] as const;

export type TransportTypeId = (typeof TRANSPORT_TYPES)[number]['id'];
export type PackageSize = (typeof PACKAGE_SIZES)[number];
