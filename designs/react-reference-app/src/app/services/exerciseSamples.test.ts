import { describe, expect, it } from 'vitest';
import { DIFFICULTIES, EQUIPMENT, EXERCISE_ROLES, EXERCISE_TAGS, EXERCISE_TYPES, MEASURES, MOVEMENT_PATTERNS, MUSCLES, measureAllowedFor } from '../domain/exercises';
import { LANDSCAPE_DEMO_CLIP, PORTRAIT_DEMO_CLIP, SAMPLE_EXERCISES } from './exerciseSamples';

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

  it('gives every resistance sample a pattern and a role', () => {
    // act
    const resistance = SAMPLE_EXERCISES.filter((exercise) => exercise.type === 'resistance');

    // assert
    expect(resistance.length).toBeGreaterThan(0);
    for (const exercise of resistance) {
      expect(MOVEMENT_PATTERNS).toContain(exercise.pattern);
      expect(EXERCISE_ROLES).toContain(exercise.role);
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

  it('carries one exercise of each type, each measured in a unit its type allows', () => {
    // assert
    expect(new Set(SAMPLE_EXERCISES.map((exercise) => exercise.type))).toEqual(new Set(EXERCISE_TYPES));
    for (const exercise of SAMPLE_EXERCISES) {
      expect(measureAllowedFor(exercise.type, exercise.measuredIn)).toBe(true);
    }
  });

  it('play a bundled landscape clip and a bundled portrait clip as their demo videos', () => {
    // act
    const clips = SAMPLE_EXERCISES.flatMap((exercise) => (exercise.videoUrl ? [exercise.videoUrl] : []));

    // assert
    expect(new Set(clips)).toEqual(new Set([LANDSCAPE_DEMO_CLIP, PORTRAIT_DEMO_CLIP]));
  });

  it('carries enough isolation exercises to pair the accessories of a session', () => {
    // act
    const isolation = SAMPLE_EXERCISES.filter((exercise) => exercise.pattern === 'isolation' && !exercise.archivedAt);

    // assert
    expect(isolation.map((exercise) => exercise.name)).toEqual([
      'Lateral Raises',
      'Lying Leg Curl',
      'Cable Hip Abduction',
      'Triceps Pushdown',
      'Biceps Curl',
    ]);
    for (const exercise of isolation) {
      expect(exercise).toMatchObject({ role: 'isolation', difficulty: 'Beginner', tags: ['Hypertrophy'] });
    }
  });

  it('tags the conditioning exercises the cardio picker offers', () => {
    // act
    const conditioning = SAMPLE_EXERCISES.filter((exercise) => exercise.tags.includes('Conditioning'));

    // assert
    expect(conditioning.map((exercise) => exercise.name)).toEqual([
      'Wall Sit',
      'Kettlebell Swing',
      'Push-Up',
      'Jumping Jacks',
      'Burpee',
      'Mountain Climber',
      'Squat Jump',
    ]);
    for (const exercise of conditioning) {
      expect(exercise.type).toBe('resistance');
      expect(['isolation', 'secondary-compound']).toContain(exercise.role);
      expect(exercise.equipment.every((item) => item === 'Kettlebell')).toBe(true);
    }
  });

  it('has no two exercises with the same name, ignoring case', () => {
    // act
    const names = SAMPLE_EXERCISES.map((exercise) => exercise.name.trim().toLowerCase());

    // assert
    expect(new Set(names).size).toBe(names.length);
  });
});
