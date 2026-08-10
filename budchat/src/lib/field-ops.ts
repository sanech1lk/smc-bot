/**
 * Worked minutes for a shift, or null while it is still running. Clamped at
 * zero so a device with a skewed clock can't produce negative payroll hours.
 */
export function shiftMinutes(startedAt: Date | string, endedAt: Date | string | null): number | null {
  if (!endedAt) return null;
  const start = new Date(startedAt).getTime();
  const end = new Date(endedAt).getTime();
  return Math.max(0, Math.floor((end - start) / 60000));
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h} ч ${m} мин` : `${m} мин`;
}

/**
 * True when more was consumed than planned. A material with nothing planned
 * yet isn't an overrun — there is simply no budget to compare against.
 */
export function materialOverrun(material: { quantityPlanned: number; quantityUsed: number }): boolean {
  if (material.quantityPlanned <= 0) return false;
  return material.quantityUsed > material.quantityPlanned;
}

/** Share of the planned quantity already used, capped at 100 for the bar width. */
export function materialProgressPercent(material: {
  quantityPlanned: number;
  quantityUsed: number;
}): number {
  if (material.quantityPlanned <= 0) return 0;
  return Math.min(100, Math.round((material.quantityUsed / material.quantityPlanned) * 100));
}
