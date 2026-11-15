export const PROGRAM_WRITE_OUTCOMES = ['works', 'fails'] as const;
export type ProgramWriteOutcome = (typeof PROGRAM_WRITE_OUTCOMES)[number];

export function writeProgramThroughServer<Result>(outcome: ProgramWriteOutcome, write: () => Result): Result {
  if (outcome === 'fails') throw new Error('The program server did not answer.');
  return write();
}
