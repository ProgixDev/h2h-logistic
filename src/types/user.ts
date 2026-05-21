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
  convention?: ConventionAcceptance;
}

export interface ProfileData {
  firstName: string;
  lastName: string;
  city: string;
  transportType: string;
  avatar?: string;
}

export interface ConventionAcceptance {
  version: string;
  representative: string;
  iban: string;
  wantsBankTransfer: boolean;
  debitAuthorized: boolean;
  signatureData: string;
  acceptedAt: string;
}

export interface ConventionAcceptanceInput {
  representative: string;
  iban: string;
  wantsBankTransfer: boolean;
  debitAuthorized: boolean;
  signatureData: string;
}
