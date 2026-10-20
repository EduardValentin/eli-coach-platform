import { describe, expect, it } from 'vitest';
import { PROGRAM_SEEDS, programForSeed } from './programSamples';
import { SAMPLE_EXERCISES } from './exerciseSamples';
import { currentVersion, draftOf } from '../domain/program';

const DAY_ONE = new Date(2026, 8, 1);

describe('programForSeed', () => {
  it('lists the seeds the Dev Toggle offers', () => {
    expect(PROGRAM_SEEDS).toEqual(['none', 'draft', 'published', 'two-versions']);
  });

  it('has no program for the none seed', () => {
    expect(programForSeed('none', 'call-1', DAY_ONE, SAMPLE_EXERCISES)).toBeNull();
  });

  it('seeds a version 1 draft with an exercise in every row', () => {
    const program = programForSeed('draft', 'call-1', DAY_ONE, SAMPLE_EXERCISES);

    expect(program?.callId).toBe('call-1');
    expect(program?.versions).toHaveLength(1);
    expect(program?.versions[0]).toMatchObject({ number: 1, state: 'draft', publishedAt: null });
    const rows = program?.versions[0].content.plan.blocks.flatMap(block =>
      block.sessions.flatMap(session => session.rows),
    );
    expect(rows?.every(row => row.exerciseId !== '')).toBe(true);
  });

  it('seeds a published version 1 dated at day one', () => {
    const program = programForSeed('published', 'call-1', DAY_ONE, SAMPLE_EXERCISES);

    expect(program?.versions).toHaveLength(1);
    expect(currentVersion(program!)).toMatchObject({ number: 1, publishedAt: DAY_ONE });
  });

  it('seeds a superseded version 1, a published version 2 and a version 3 draft', () => {
    const program = programForSeed('two-versions', 'call-1', DAY_ONE, SAMPLE_EXERCISES);

    expect(program?.versions.map(version => [version.number, version.state])).toEqual([
      [1, 'superseded'],
      [2, 'published'],
      [3, 'draft'],
    ]);
    expect(currentVersion(program!)?.whatChanged).toBe(
      'Added a second lower day and raised steps to 8,000, because your technique is stable and energy is good.',
    );
    expect(currentVersion(program!)?.content.plan.blocks[0].dailySteps).toBe(8000);
    expect(draftOf(program!)?.content.plan.blocks[0].id).not.toBe(
      currentVersion(program!)?.content.plan.blocks[0].id,
    );
  });
});
