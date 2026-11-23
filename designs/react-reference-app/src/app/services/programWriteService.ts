export const PROGRAM_WRITE_OUTCOMES = ['works', 'fails'] as const;
export type ProgramWriteOutcome = (typeof PROGRAM_WRITE_OUTCOMES)[number];

export const DRAFT_SAVE_OUTCOMES = ['works', 'fails', 'stale'] as const;
export type DraftSaveOutcome = (typeof DRAFT_SAVE_OUTCOMES)[number];
export type DraftSaveAnswer = 'saved' | 'changed-elsewhere';

export const DRAFT_SAVE_LATENCY_MS = 500;

export function writeProgramThroughServer<Result>(outcome: ProgramWriteOutcome, write: () => Result): Result {
  if (outcome === 'fails') throw new Error('The program server did not answer.');
  return write();
}

export async function saveDraftThroughServer(outcome: DraftSaveOutcome, write: () => void): Promise<DraftSaveAnswer> {
  await new Promise(resolve => setTimeout(resolve, DRAFT_SAVE_LATENCY_MS));
  if (outcome === 'fails') throw new Error('The program server did not answer.');
  if (outcome === 'stale') return 'changed-elsewhere';
  write();
  return 'saved';
}
