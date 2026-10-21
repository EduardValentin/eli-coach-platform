import { describe, expect, it } from 'vitest';
import { PROGRAM_SEEDS, programForSeed, type SeedClient } from './programSamples';
import { SAMPLE_EXERCISES } from './exerciseSamples';
import { currentVersion, draftOf, roleForSlot } from '../domain/program';
import { slotPlanFor } from '../domain/splitTemplates';

const DAY_ONE = new Date(2026, 8, 1);
const CLIENT: SeedClient = { callId: 'call-1', dayOne: DAY_ONE, cycleMode: 'adapted', equipment: ['Dumbbells', 'Bench'] };
const exercisesById = new Map(SAMPLE_EXERCISES.map(exercise => [exercise.id, exercise]));

describe('programForSeed', () => {
  it('lists the seeds the Dev Toggle offers', () => {
    expect(PROGRAM_SEEDS).toEqual(['none', 'draft', 'published', 'two-versions']);
  });

  it('has no program for the none seed', () => {
    expect(programForSeed('none', CLIENT, SAMPLE_EXERCISES)).toBeNull();
  });

  it('seeds a version 1 draft with an exercise in every row', () => {
    const program = programForSeed('draft', CLIENT, SAMPLE_EXERCISES);

    expect(program?.callId).toBe('call-1');
    expect(program?.versions).toHaveLength(1);
    expect(program?.versions[0]).toMatchObject({ number: 1, state: 'draft', publishedAt: null });
    const rows = program?.versions[0].content.plan.blocks.flatMap(block =>
      block.sessions.flatMap(session => session.rows),
    );
    expect(rows?.every(row => row.exerciseId !== '')).toBe(true);
  });

  it('seeds a published version 1 dated at day one', () => {
    const program = programForSeed('published', CLIENT, SAMPLE_EXERCISES);

    expect(program?.versions).toHaveLength(1);
    expect(currentVersion(program!)).toMatchObject({ number: 1, publishedAt: DAY_ONE });
  });

  it('seeds a superseded version 1, a published version 2 and a version 3 draft', () => {
    const program = programForSeed('two-versions', CLIENT, SAMPLE_EXERCISES);

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

  it('fills every slot from its plan with distinct exercises and skips a slot without a candidate', () => {
    // act
    const program = programForSeed('draft', CLIENT, SAMPLE_EXERCISES);

    // assert
    const [block] = program!.versions[0].content.plan.blocks;
    for (const session of block.sessions) {
      expect(session.rows.map(row => row.slot)).toEqual(['A', 'B', 'C', 'C', 'D']);
      expect(new Set(session.rows.map(row => row.exerciseId)).size).toBe(session.rows.length);
      for (const row of session.rows) {
        const pattern = exercisesById.get(row.exerciseId)?.pattern;
        expect(slotPlanFor(block, session, row.slot)?.patterns).toContain(pattern);
      }
    }
  });

  it('pairs two accessories in one superset group in every seeded session', () => {
    // act
    const program = programForSeed('draft', CLIENT, SAMPLE_EXERCISES);

    // assert
    for (const session of program!.versions[0].content.plan.blocks[0].sessions) {
      const accessories = session.rows.filter(row => row.slot === 'C');
      expect(accessories).toHaveLength(2);
      expect(accessories[0].supersetGroup).toBeDefined();
      expect(accessories[1].supersetGroup).toBe(accessories[0].supersetGroup);
      expect(session.rows.filter(row => row.slot !== 'C').every(row => row.supersetGroup === undefined)).toBe(true);
    }
  });

  it('seeds a single accessory without a superset when the library has only one', () => {
    // arrange
    const [firstIsolation] = SAMPLE_EXERCISES.filter(exercise => exercise.pattern === 'isolation');
    const library = SAMPLE_EXERCISES.filter(exercise => exercise.pattern !== 'isolation' || exercise === firstIsolation);

    // act
    const program = programForSeed('draft', CLIENT, library);

    // assert
    const [session] = program!.versions[0].content.plan.blocks[0].sessions;
    const accessories = session.rows.filter(row => row.slot === 'C');
    expect(accessories.map(row => row.exerciseId)).toEqual([firstIsolation.id]);
    expect(accessories[0].supersetGroup).toBeUndefined();
  });

  it('prefers the exercise whose role matches the slot', () => {
    // act
    const program = programForSeed('draft', CLIENT, SAMPLE_EXERCISES);

    // assert
    const [session] = program!.versions[0].content.plan.blocks[0].sessions;
    const main = session.rows.find(row => row.slot === 'A');
    expect(exercisesById.get(main!.exerciseId)?.role).toBe(roleForSlot('A'));
  });

  it('stores the client equipment and the onboarding goal', () => {
    // act
    const program = programForSeed('draft', CLIENT, SAMPLE_EXERCISES);

    // assert
    expect(program).toMatchObject({ equipment: ['Dumbbells', 'Bench'], goal: 'Lose fat' });
  });

  it('gives the program the cycle mode it is seeded with', () => {
    expect(programForSeed('draft', { ...CLIENT, cycleMode: 'general' }, SAMPLE_EXERCISES)?.cycleMode).toBe('general');
  });

  it('opens every main compound row with two warm-up sets', () => {
    // act
    const program = programForSeed('draft', CLIENT, SAMPLE_EXERCISES);

    // assert
    const [session] = program!.versions[0].content.plan.blocks[0].sessions;
    const main = session.rows.find(row => row.slot === 'A');
    expect(main!.sets.slice(0, 2).map(set => [set.kind, set.reps.min])).toEqual([
      ['warm-up', 8],
      ['warm-up', 5],
    ]);
    expect(main!.sets.slice(2).every(set => set.kind === 'working')).toBe(true);
  });

  it('seeds easy cardio on a library cardio exercise', () => {
    // act
    const program = programForSeed('draft', CLIENT, SAMPLE_EXERCISES);

    // assert
    const [cardio] = program!.versions[0].content.plan.blocks[0].cardioSessions;
    expect(cardio.name).toBe('Easy cardio');
    expect(exercisesById.get(cardio.segments[0].exerciseId)?.type).toBe('cardio');
  });

  it('makes one cardio day intervals in the two-versions seed', () => {
    // act
    const program = programForSeed('two-versions', CLIENT, SAMPLE_EXERCISES);

    // assert
    const names = currentVersion(program!)?.content.plan.blocks[0].cardioSessions.map(cardio => cardio.name);
    expect(names?.filter(name => name === 'Intervals')).toHaveLength(1);
  });
});
