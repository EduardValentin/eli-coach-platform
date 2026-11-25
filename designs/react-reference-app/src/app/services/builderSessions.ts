export const BUILDER_SESSIONS = ['full', 'first-week'] as const;
export type BuilderSessions = (typeof BUILDER_SESSIONS)[number];
