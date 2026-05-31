/** Local device time → Good Morning / Afternoon / Evening (17:00–04:59 = evening). */
export function timeOfDaySalutation(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'Good Morning';
  if (hour >= 12 && hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export function greetingWithName(firstName: string, date?: Date): string {
  const name = firstName.trim() || 'Player';
  return `${timeOfDaySalutation(date)}, ${name}`;
}
