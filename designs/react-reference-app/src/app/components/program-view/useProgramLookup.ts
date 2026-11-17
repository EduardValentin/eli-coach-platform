import { useAppState } from '../../context/AppContext';
import { usePrograms } from '../../context/ProgramContext';
import type { Program } from '../../domain/program';
import type { ProgramLoadOutcome } from '../../services/programLoadService';

export type PendingProgramLoad = Exclude<ProgramLoadOutcome, 'ready'>;

export type ProgramLookup =
  | { status: 'pending'; load: PendingProgramLoad; retry: () => void }
  | { status: 'missing' }
  | { status: 'found'; program: Program };

/**
 * A client's program, decided in one order for every program page: while the programs load, or until the stored
 * ones are read, the page waits, since an absent program means nothing before then; only after that is a program
 * missing or found.
 */
export function useProgramLookup(callId: string | null): ProgramLookup {
  const { appState, setAppState } = useAppState();
  const { hydrated, programFor } = usePrograms();
  const retry = () => setAppState({ programLoad: 'ready' });
  if (appState.programLoad !== 'ready') return { status: 'pending', load: appState.programLoad, retry };
  if (!hydrated) return { status: 'pending', load: 'loading', retry };
  const program = callId === null ? undefined : programFor(callId);
  return program ? { status: 'found', program } : { status: 'missing' };
}
