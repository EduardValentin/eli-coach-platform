import { describe, expect, it } from 'vitest';
import { DIFFICULTIES, EQUIPMENT, EXERCISE_TAGS, EXERCISE_TYPES, MEASURES, MUSCLES } from '../domain/exercises';
import { SAMPLE_EXERCISES } from './exerciseSamples';

describe('the sample exercises', () => {
  it('use only vocabulary values, so the form can show every stored value', () => {
    // assert
    for (const exercise of SAMPLE_EXERCISES) {
      expect(EXERCISE_TYPES).toContain(exercise.type);
      expect(MEASURES).toContain(exercise.measuredIn);
      expect(DIFFICULTIES).toContain(exercise.difficulty);
      for (const muscle of [...exercise.primaryMuscles, ...exercise.secondaryMuscles]) {
        expect(MUSCLES).toContain(muscle);
      }
      for (const item of exercise.equipment) expect(EQUIPMENT).toContain(item);
      for (const tag of exercise.tags) expect(EXERCISE_TAGS).toContain(tag);
    }
  });

  it('never lists a muscle as both primary and secondary', () => {
    // assert
    for (const exercise of SAMPLE_EXERCISES) {
      const overlap = exercise.primaryMuscles.filter((muscle) => exercise.secondaryMuscles.includes(muscle));
      expect(overlap).toEqual([]);
    }
  });

  it('carries one per-side exercise, one timed exercise and one archived exercise', () => {
    // assert
    expect(SAMPLE_EXERCISES.some((exercise) => exercise.perSide)).toBe(true);
    expect(SAMPLE_EXERCISES.some((exercise) => exercise.measuredIn === 'time')).toBe(true);
    expect(SAMPLE_EXERCISES.some((exercise) => exercise.archivedAt)).toBe(true);
  });

  it('has no two exercises with the same name, ignoring case', () => {
    // act
    const names = SAMPLE_EXERCISES.map((exercise) => exercise.name.trim().toLowerCase());

    // assert
    expect(new Set(names).size).toBe(names.length);
  });
});
