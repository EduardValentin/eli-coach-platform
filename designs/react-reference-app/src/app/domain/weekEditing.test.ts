import { describe, expect, it } from 'vitest';
import type { Block } from './program';
import { cardioPreset } from './programCardio';
import { newBlock } from './programSuggestions';
import { blockWithCardio, blockWithDay, plannedSessions } from './weekEditing';

function block(): Block {
  return newBlock('foundation', 4, {
    setup: {
      goal: 'Lose fat',
      level: 'beginner',
      trainingDays: 3,
      sessionMinutes: 60,
      cycleMode: 'general',
      language: 'en',
      dailySteps: 6000,
      equipment: [],
      splitShape: 'full-body',
    },
    library: [],
  });
}

describe('blockWithDay', () => {
  it('adds the chosen cardio session for a day that becomes cardio', () => {
    // arrange
    const start = block();
    const session = cardioPreset('liss', []);

    // act
    const next = blockWithDay(start, 'sat', { kind: 'cardio', session });

    // assert
    expect(next.calendar.sat).toEqual({ kind: 'cardio', cardioId: session.id });
    expect(next.cardioSessions).toContainEqual(session);
    expect(next.cardioSessions).toHaveLength(start.cardioSessions.length + 1);
  });

  it('keeps the cardio session of a day that is already cardio', () => {
    // arrange
    const start = block();
    const current = start.calendar.tue;

    // act
    const next = blockWithDay(start, 'tue', { kind: 'cardio', session: cardioPreset('hiit', []) });

    // assert
    expect(next.calendar.tue).toEqual(current);
    expect(next.cardioSessions).toEqual(start.cardioSessions);
  });

  it('removes the cardio session of a day that stops being cardio', () => {
    // arrange
    const start = block();
    expect(start.calendar.tue.kind).toBe('cardio');

    // act
    const next = blockWithDay(start, 'tue', { kind: 'rest' });

    // assert
    expect(next.calendar.tue).toEqual({ kind: 'rest' });
    expect(next.cardioSessions).toHaveLength(start.cardioSessions.length - 1);
  });

  it('moves a session to another day and rests the day it left', () => {
    // arrange
    const start = block();
    const [first] = start.sessions;

    // act
    const next = blockWithDay(start, 'sat', { kind: 'session', sessionId: first.id });

    // assert
    expect(next.calendar.sat).toEqual({ kind: 'session', sessionId: first.id });
    expect(next.calendar.mon).toEqual({ kind: 'rest' });
  });
});

describe('blockWithCardio', () => {
  it('replaces the cardio session with the same id', () => {
    // arrange
    const start = block();
    const [cardio] = start.cardioSessions;
    const renamed = { ...cardio, name: 'Long walk' };

    // act
    const next = blockWithCardio(start, renamed);

    // assert
    expect(next.cardioSessions[0]).toEqual(renamed);
    expect(next.cardioSessions.slice(1)).toEqual(start.cardioSessions.slice(1));
  });
});

describe('plannedSessions', () => {
  it('lists strength and cardio sessions by their weekday and unplaced sessions last', () => {
    // arrange
    const unplaced = blockWithDay(block(), 'mon', { kind: 'rest' });

    // act
    const planned = plannedSessions(unplaced).map(entry => (entry.kind === 'cardio' ? entry.cardio.name : entry.session.name));

    // assert
    expect(planned).toEqual(['Easy cardio', 'Full Body B', 'Easy cardio', 'Full Body C', 'Full Body A']);
  });
});
