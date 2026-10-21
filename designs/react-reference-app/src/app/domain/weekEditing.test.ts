import { describe, expect, it } from 'vitest';
import type { Block } from './program';
import { newBlock } from './programSuggestions';
import { blockWithCardio, blockWithDay, sessionsInCalendarOrder } from './weekEditing';

function block(): Block {
  return newBlock(
    'foundation',
    4,
    {
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
    'en',
  );
}

describe('blockWithDay', () => {
  it('creates a cardio session for a day that becomes cardio', () => {
    // arrange
    const start = block();

    // act
    const next = blockWithDay(start, 'sat', { kind: 'cardio' });

    // assert
    const entry = next.calendar.sat;
    expect(entry.kind).toBe('cardio');
    const cardio = next.cardioSessions.find(other => entry.kind === 'cardio' && other.id === entry.cardioId);
    expect(cardio).toMatchObject({ type: 'liss', minutes: 30, weekday: 'sat', intensityText: 'You can hold a conversation' });
    expect(next.cardioSessions).toHaveLength(start.cardioSessions.length + 1);
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
  it('refreshes the intensity text with the type', () => {
    // arrange
    const start = block();
    const [cardio] = start.cardioSessions;

    // act
    const next = blockWithCardio(start, { ...cardio, type: 'hiit' });

    // assert
    expect(next.cardioSessions[0]).toMatchObject({ type: 'hiit', intensityText: 'Hard: only a few words at a time' });
  });
});

describe('sessionsInCalendarOrder', () => {
  it('orders sessions by their weekday', () => {
    // arrange
    const start = block();
    const [first, second] = start.sessions;
    const moved = blockWithDay(start, 'sun', { kind: 'session', sessionId: first.id });

    // act
    const order = sessionsInCalendarOrder(moved).map(session => session.id);

    // assert
    expect(order[0]).toBe(second.id);
    expect(order.at(-1)).toBe(first.id);
  });
});
