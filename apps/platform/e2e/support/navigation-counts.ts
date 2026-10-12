export function countedNavigationName(label: string, count: number): string {
  return count === 0 ? label : `${label} (${count} waiting on you)`;
}
