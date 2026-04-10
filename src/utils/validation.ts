export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 13;
}

export function isValidOTP(otp: string): boolean {
  return /^\d{6}$/.test(otp);
}

export function isNotEmpty(value: string | undefined | null): boolean {
  return value != null && value.trim().length > 0;
}

export function isValidWeight(weight: number): boolean {
  return weight > 0 && weight <= 100;
}

export function isValidPackageCount(count: number): boolean {
  return Number.isInteger(count) && count > 0 && count <= 50;
}
