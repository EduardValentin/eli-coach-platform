export function systemClock(): { now(): Date } {
  return { now: () => new Date() };
}
