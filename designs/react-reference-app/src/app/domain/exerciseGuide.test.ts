import { describe, expect, it } from 'vitest';
import { currentVersion, type ProgramVersion } from './program';
import { exerciseGuide } from './exerciseGuide';
import { SAMPLE_EXERCISES } from '../services/exerciseSamples';
import { programForSeed } from '../services/programSamples';

function publishedVersion(): ProgramVersion {
  const program = programForSeed('published', { callId: 'call', dayOne: new Date(2026, 8, 16), equipment: [] }, SAMPLE_EXERCISES);
  const version = program && currentVersion(program);
  if (!version) throw new Error('seed missing');
  return version;
}

function withFirstRow(version: ProgramVersion, cues: string, substitutions: string[]): { version: ProgramVersion; exerciseId: string } {
  const copy = structuredClone(version);
  const row = copy.content.plan.blocks[0].sessions[0].rows[0];
  copy.content.plan.blocks.forEach(block =>
    block.sessions.forEach(session => session.rows.forEach(other => {
      if (other.exerciseId === row.exerciseId) Object.assign(other, { cues, substitutions });
    })),
  );
  return { version: copy, exerciseId: row.exerciseId };
}

describe('exerciseGuide', () => {
  it('uses the coach cues and swaps from her program, each swap once', () => {
    // arrange
    const { version, exerciseId } = withFirstRow(publishedVersion(), 'Brace first', ['e10', 'e10', 'e26']);

    // act
    const guide = exerciseGuide({ exerciseId, library: SAMPLE_EXERCISES, version });

    // assert
    expect(guide?.cues).toEqual(['Brace first']);
    expect(guide?.swaps.map(swap => swap.id)).toEqual(['e10', 'e26']);
  });

  it('falls back to the library cues and offers no swaps outside her program', () => {
    // arrange
    const outsideProgram = SAMPLE_EXERCISES.find(exercise => exercise.id === 'e2');

    // act
    const guide = exerciseGuide({ exerciseId: 'e2', library: SAMPLE_EXERCISES, version: undefined });

    // assert
    expect(guide?.cues).toEqual([outsideProgram?.cues]);
    expect(guide?.swaps).toEqual([]);
  });

  it('leaves out archived swaps and finds nothing for an archived exercise', () => {
    // arrange
    const { version, exerciseId } = withFirstRow(publishedVersion(), 'Brace first', ['e13', 'e10']);

    // act
    const guide = exerciseGuide({ exerciseId, library: SAMPLE_EXERCISES, version });

    // assert
    expect(guide?.swaps.map(swap => swap.id)).toEqual(['e10']);
    expect(exerciseGuide({ exerciseId: 'e13', library: SAMPLE_EXERCISES, version })).toBeNull();
  });
});
