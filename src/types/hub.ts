export type HubType =
  | 'gare'              // 🚂 Train station
  | 'bus_station'       // 🚌 Bus station
  | 'highway_exit'      // 🛣️ Highway exit point
  | 'shopping_center'   // 🛒 Shopping center
  | 'partner_shop'      // 🏪 E-commerce partner
  | 'locker'            // 📦 Automated locker
  | 'relay_point';      // 📍 Generic relay point

export interface Hub {
  id: string;
  name: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  type: HubType;
  openingHours: string;
  phone?: string;
  image?: string;
  availablePackages?: number; // For e-commerce partners: packages waiting
  /** Meeting-zone diameter in metres. Default applied where read (60). */
  zoneDiameterMeters?: number;
  /** Label for the point central. Default « Entrée principale côté parking ». */
  centralPointLabel?: string;
}
