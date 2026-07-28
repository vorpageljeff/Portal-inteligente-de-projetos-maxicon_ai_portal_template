export function percentage(part: number, total: number): number {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) return 0;
  return Math.round((part / total) * 100);
}

export function progressGap(actual: number, planned: number): number {
  if (!Number.isFinite(actual) || !Number.isFinite(planned)) return 0;
  return Math.round((actual - planned) * 10) / 10;
}

export function remainingHours(contracted: number, consumed: number): number {
  if (!Number.isFinite(contracted) || !Number.isFinite(consumed)) return 0;
  return Math.max(Math.round((contracted - consumed) * 100) / 100, 0);
}
