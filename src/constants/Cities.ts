export const CITIES = [
  'Nice',
  'Cannes',
  'Marseille',
  'Toulon',
  'Antibes',
  'Fréjus',
  'Monaco',
  'Menton',
  'Grasse',
  'Saint-Raphaël',
] as const;

export type CityName = (typeof CITIES)[number];
