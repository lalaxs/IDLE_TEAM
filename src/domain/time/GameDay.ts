/** The local game day starts at 05:00. Noon keeps date-only calculations stable. */
export function getGameDayDate(now = new Date()): Date {
  const date = new Date(now);
  if (date.getHours() < 5) date.setDate(date.getDate() - 1);
  date.setHours(12, 0, 0, 0);
  return date;
}

export function getDateKey(now = new Date()): string {
  const date = getGameDayDate(now);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
