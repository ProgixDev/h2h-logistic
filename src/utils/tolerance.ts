import dayjs from 'dayjs';

export const DEFAULT_TOLERANCE_MINUTES = 10;

export function getToleranceWindow(
  scheduledTime: string,
  toleranceMinutes = DEFAULT_TOLERANCE_MINUTES,
): { start: string; end: string; isWithin: boolean } {
  const scheduled = dayjs(scheduledTime);
  const start = scheduled.subtract(toleranceMinutes, 'minute');
  const end = scheduled.add(toleranceMinutes, 'minute');
  const now = dayjs();

  return {
    start: start.format('HH:mm'),
    end: end.format('HH:mm'),
    isWithin: now.isAfter(start) && now.isBefore(end),
  };
}

export function formatToleranceLabel(toleranceMinutes = DEFAULT_TOLERANCE_MINUTES): string {
  return `-${toleranceMinutes} / +${toleranceMinutes} min`;
}

export function isWithinTolerance(
  scheduledTime: string,
  toleranceMinutes = DEFAULT_TOLERANCE_MINUTES,
): boolean {
  const scheduled = dayjs(scheduledTime);
  const now = dayjs();
  const diffMinutes = Math.abs(now.diff(scheduled, 'minute'));
  return diffMinutes <= toleranceMinutes;
}
