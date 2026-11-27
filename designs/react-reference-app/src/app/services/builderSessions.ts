import type { Block } from '../domain/program';
import { plannedSessions, type PlannedSession } from '../domain/weekEditing';

export const BUILDER_SESSIONS = ['full', 'first-week'] as const;
export type BuilderSessions = (typeof BUILDER_SESSIONS)[number];

/** The weekly sets and the cardio sessions are the prototype ahead of production; the other setting is production as shipped. */
export function hasWeeklySetsAndCardio(sessions: BuilderSessions): boolean {
  return sessions === 'full';
}

/** The sessions listed under the week: with the first week only, a cardio day has no session to list. */
export function listedSessions(block: Block, sessions: BuilderSessions): PlannedSession[] {
  return plannedSessions(block).filter(entry => entry.kind !== 'cardio' || hasWeeklySetsAndCardio(sessions));
}
