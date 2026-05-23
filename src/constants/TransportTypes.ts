import type { ImageSourcePropType } from 'react-native';
import type { IconName } from '@/components/ui/Icon';

export const TRANSPORT_TYPES = [
  {
    id: 'walking',
    label: 'À pied',
    iconName: 'walk' as IconName,
    image: require('../../assets/images/3d-emojis/Walking.png') as ImageSourcePropType,
    capacity: 'XS-S',
  },
  {
    id: 'bike',
    label: 'Vélo',
    iconName: 'bike' as IconName,
    image: require('../../assets/images/3d-emojis/Bike.png') as ImageSourcePropType,
    capacity: 'XS-M',
  },
  {
    id: 'scooter',
    label: 'Scooter',
    iconName: 'scooter' as IconName,
    image: require('../../assets/images/3d-emojis/Scooter.png') as ImageSourcePropType,
    capacity: 'XS-M',
  },
  {
    id: 'moto',
    label: 'Moto',
    iconName: 'moto' as IconName,
    image: require('../../assets/images/3d-emojis/Moto.png') as ImageSourcePropType,
    capacity: 'XS-M',
  },
  {
    id: 'car',
    label: 'Voiture',
    iconName: 'car' as IconName,
    image: require('../../assets/images/3d-emojis/Car.png') as ImageSourcePropType,
    capacity: 'XS-XL',
  },
  {
    id: 'utilitaire',
    label: 'Utilitaire',
    iconName: 'utilitaire' as IconName,
    image: require('../../assets/images/3d-emojis/Van.png') as ImageSourcePropType,
    capacity: 'XS-XL',
  },
  {
    id: 'bus',
    label: 'Bus',
    iconName: 'bus' as IconName,
    image: require('../../assets/images/3d-emojis/Bus.png') as ImageSourcePropType,
    capacity: 'XS-M',
  },
  {
    id: 'train',
    label: 'Train',
    iconName: 'train' as IconName,
    image: require('../../assets/images/3d-emojis/Train.png') as ImageSourcePropType,
    capacity: 'XS-L',
  },
] as const;

export const PACKAGE_SIZES = ['XS', 'S', 'M', 'L', 'XL'] as const;

export type TransportTypeId = (typeof TRANSPORT_TYPES)[number]['id'];
export type PackageSize = (typeof PACKAGE_SIZES)[number];
