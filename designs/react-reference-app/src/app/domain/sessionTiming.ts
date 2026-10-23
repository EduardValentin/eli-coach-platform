import type { Block, Session } from './program';

const SECONDS_PER_SET = 45;
const SESSION_OVERHEAD_MINUTES = 8;
const COOL_DOWN_MINUTES = 5;
const OVER_TARGET_TOLERANCE_MINUTES = 10;

export function estimatedMinutes(session: Session): number {
  const supersetsSeen = new Set<string>();
  let seconds = 0;
  for (const row of session.rows) {
    if (row.supersetGroup === undefined) {
      seconds += row.sets.length * (SECONDS_PER_SET + row.restSeconds);
    } else if (!supersetsSeen.has(row.supersetGroup)) {
      supersetsSeen.add(row.supersetGroup);
      seconds += row.sets.length * (2 * SECONDS_PER_SET + row.restSeconds);
    }
  }
  const coolDown = session.coolDown.enabled ? COOL_DOWN_MINUTES : 0;
  return Math.round(SESSION_OVERHEAD_MINUTES + seconds / 60 + coolDown);
}

export function isOverTarget(session: Session, block: Block): boolean {
  return estimatedMinutes(session) > block.targetMinutes + OVER_TARGET_TOLERANCE_MINUTES;
}
