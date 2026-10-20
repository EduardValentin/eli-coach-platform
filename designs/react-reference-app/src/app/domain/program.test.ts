import { describe, expect, it } from 'vitest';
import {
  currentVersion,
  draftOf,
  newId,
  positionLabel,
  roleForSlot,
  type Program,
  type ProgramContent,
  type ProgramVersion,
  type Row,
  type Session,
  type VersionState,
} from './program';

function row(slot: Row['slot'], supersetGroup?: string): Row {
  return {
    id: newId(),
    exerciseId: 'exercise-1',
    slot,
    supersetGroup,
    sets: 3,
    reps: { min: 8, max: 10 },
    rir: { min: 1, max: 2 },
    restSeconds: 90,
    lastSetTechnique: 'none',
    substitutions: [],
    progression: { kind: 'double' },
    cues: '',
    touched: [],
  };
}

function sessionOf(rows: Row[]): Session {
  return {
    id: 'session-1',
    originId: 'session-1',
    name: 'Lower A',
    warmUp: { mobilityExerciseIds: [], warmUpSetsNote: '' },
    coolDown: false,
    rows,
  };
}

const emptyContent: ProgramContent = {
  header: { title: '', focus: '', personalNote: '' },
  plan: { blocks: [] },
  cycleRules: [],
  nutritionNotes: '',
  lifestyleNotes: '',
};

function version(number: number, state: VersionState): ProgramVersion {
  return { number, state, publishedAt: null, whatChanged: '', content: emptyContent };
}

function programWith(versions: ProgramVersion[]): Program {
  return { callId: 'call-1', goal: 'strength', language: 'en', cycleMode: 'adapted', level: 'beginner', versions };
}

describe('roleForSlot', () => {
  it.each([
    ['A', 'main-compound'],
    ['B', 'secondary-compound'],
    ['C', 'isolation'],
    ['D', 'isolation'],
  ] as const)('maps slot %s to %s', (slot, role) => {
    expect(roleForSlot(slot)).toBe(role);
  });
});

describe('positionLabel', () => {
  it('numbers rows of a superset in session order', () => {
    const first = row('C', 'ss-1');
    const second = row('C', 'ss-1');
    const session = sessionOf([row('A'), row('B'), first, second]);

    expect(positionLabel(session, first)).toBe('C1');
    expect(positionLabel(session, second)).toBe('C2');
  });

  it('leaves a lone row without a number', () => {
    const lone = row('C');
    const session = sessionOf([row('A'), lone]);

    expect(positionLabel(session, lone)).toBe('C');
  });

  it('labels single-row slots by letter', () => {
    const a = row('A');
    const d = row('D');
    const session = sessionOf([a, d]);

    expect(positionLabel(session, a)).toBe('A');
    expect(positionLabel(session, d)).toBe('D');
  });
});

describe('versions', () => {
  it('finds the published and the draft version', () => {
    const program = programWith([version(1, 'superseded'), version(2, 'published'), version(3, 'draft')]);

    expect(currentVersion(program)?.number).toBe(2);
    expect(draftOf(program)?.number).toBe(3);
  });

  it('returns undefined when no version has the state', () => {
    const program = programWith([version(1, 'draft')]);

    expect(currentVersion(program)).toBeUndefined();
    expect(draftOf(programWith([]))).toBeUndefined();
  });
});

describe('newId', () => {
  it('returns a distinct id on every call', () => {
    expect(newId()).not.toBe(newId());
  });
});
