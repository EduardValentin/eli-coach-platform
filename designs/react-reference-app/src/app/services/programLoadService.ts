export const PROGRAM_LOAD_OUTCOMES = ['ready', 'loading', 'failed'] as const;
export type ProgramLoadOutcome = (typeof PROGRAM_LOAD_OUTCOMES)[number];
