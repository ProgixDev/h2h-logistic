import dayjs from 'dayjs';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

export function formatDate(date: string, format = 'DD/MM/YYYY'): string {
  return dayjs(date).format(format);
}

export function formatTime(date: string): string {
  return dayjs(date).format('HH:mm');
}

export function formatDateTime(date: string): string {
  return dayjs(date).format('DD/MM/YYYY HH:mm');
}

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('33') && cleaned.length === 11) {
    return `+33 ${cleaned.slice(2, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5, 7)} ${cleaned.slice(7, 9)} ${cleaned.slice(9, 11)}`;
  }
  return phone;
}

export function formatWeight(kg: number): string {
  if (kg < 1) return `${Math.round(kg * 1000)} g`;
  return `${kg} kg`;
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}
