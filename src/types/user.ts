export interface User {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  avatar?: string;
  role: 'transporter';
  isVerified: boolean;
  isOnline: boolean;
  rating: number;
  totalDeliveries: number;
  createdAt: string;
}

export interface TransporterProfile extends User {
  transportTypes: string[];
  favoriteHubs: string[];
  vehicleInfo?: string;
  documentsVerified: boolean;
  city?: string;
}

export interface ProfileData {
  firstName: string;
  lastName: string;
  city: string;
  transportType: string;
  avatar?: string;
}
