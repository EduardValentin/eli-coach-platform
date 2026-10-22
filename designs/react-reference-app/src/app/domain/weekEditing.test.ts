import { describe, expect, it } from 'vitest';
import type { Block, Session } from './program';
import { cardioPreset } from './programCardio';
import { emptyRow, newBlock } from './programSuggestions';
import { blockWithCardio, blockWithDay, describeReset, plannedSessions, relayoutBlock } from './weekEditing';

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

function filled(session: Session, exerciseCount: number): Session {
  const rows = Array.from({ length: exerciseCount }, (_, index) => ({ ...emptyRow('foundation', 'C'), exerciseId: `e${index}` }));
  return { ...session, rows };
}

function filledBlock(...exerciseCounts: number[]): Block {
  const start = block();
  return { ...start, sessions: start.sessions.map((session, index) => filled(session, exerciseCounts[index] ?? 0)) };
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

  it('removes the strength session of a day that becomes a rest day, with every day it was on', () => {
    // arrange
    const start = block();
    const [first] = start.sessions;
    const twice = { ...start, calendar: { ...start.calendar, sat: { kind: 'session' as const, sessionId: first.id } } };

    // act
    const next = blockWithDay(twice, 'mon', { kind: 'rest' });

    // assert
    expect(next.sessions.map(session => session.id)).not.toContain(first.id);
    expect(next.sessions).toHaveLength(start.sessions.length - 1);
    expect(next.calendar.mon).toEqual({ kind: 'rest' });
    expect(next.calendar.sat).toEqual({ kind: 'rest' });
  });

  it('removes the strength session of a day that becomes cardio', () => {
    // arrange
    const start = block();
    const [first] = start.sessions;
    const cardio = cardioPreset('liss', []);

    // act
    const next = blockWithDay(start, 'mon', { kind: 'cardio', session: cardio });

    // assert
    expect(next.sessions.map(session => session.id)).not.toContain(first.id);
    expect(next.calendar.mon).toEqual({ kind: 'cardio', cardioId: cardio.id });
    expect(next.cardioSessions).toContainEqual(cardio);
  });

  it('keeps the strength session a day gives up for another session', () => {
    // arrange
    const start = block();
    const [first, second] = start.sessions;

    // act
    const next = blockWithDay(start, 'mon', { kind: 'session', sessionId: second.id });

    // assert
    expect(next.sessions).toEqual(start.sessions);
    expect(next.calendar.mon).toEqual({ kind: 'session', sessionId: second.id });
    expect(Object.values(next.calendar)).not.toContainEqual({ kind: 'session', sessionId: first.id });
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
    const start = block();
    const unplaced = blockWithDay(start, 'mon', { kind: 'session', sessionId: start.sessions[1].id });

    // act
    const planned = plannedSessions(unplaced).map(entry => (entry.kind === 'cardio' ? entry.cardio.name : entry.session.name));

    // assert
    expect(planned).toEqual(['Full Body B', 'Easy cardio', 'Easy cardio', 'Full Body C', 'Full Body A']);
  });
});

describe('relayoutBlock', () => {
  it('starts with as many training days as the block has sessions', () => {
    // act
    const start = block();

    // assert
    expect(start.trainingDays).toBe(3);
    expect(start.sessions).toHaveLength(3);
  });

  it('keeps the first sessions and adds empty ones from the split for more training days', () => {
    // arrange
    const start = filledBlock(5, 4, 3);

    // act
    const next = relayoutBlock(start, 5);

    // assert
    expect(next.trainingDays).toBe(5);
    expect(next.sessions.slice(0, 3)).toEqual(start.sessions);
    expect(next.sessions.slice(3).map(session => [session.name, session.rows])).toEqual([
      ['Full Body D', []],
      ['Full Body E', []],
    ]);
    expect(['mon', 'tue', 'wed', 'fri', 'sat'].map(day => next.calendar[day as keyof Block['calendar']])).toEqual(
      next.sessions.map(session => ({ kind: 'session', sessionId: session.id })),
    );
  });

  it('drops the sessions past the new day count and keeps cardio on the days left free', () => {
    // arrange
    const start = filledBlock(5, 4, 3);

    // act
    const next = relayoutBlock(start, 2);

    // assert
    expect(next.sessions).toEqual(start.sessions.slice(0, 2));
    expect(next.calendar.mon).toEqual({ kind: 'session', sessionId: start.sessions[0].id });
    expect(next.calendar.thu).toEqual({ kind: 'session', sessionId: start.sessions[1].id });
    expect(next.cardioSessions).toEqual(start.cardioSessions);
    expect(next.calendar.tue).toEqual({ kind: 'cardio', cardioId: start.cardioSessions[0].id });
  });

  it('drops the cardio sessions that no free day is left for', () => {
    // arrange
    const start = { ...block(), cardioSessions: Array.from({ length: 4 }, () => cardioPreset('liss', [])) };

    // act
    const next = relayoutBlock(start, 5);

    // assert
    expect(next.cardioSessions).toEqual(start.cardioSessions.slice(0, 2));
    expect([next.calendar.thu, next.calendar.sun]).toEqual(start.cardioSessions.slice(0, 2).map(cardio => ({ kind: 'cardio', cardioId: cardio.id })));
  });
});

describe('describeReset', () => {
  it('names every session with exercises when the split changes or resets', () => {
    // arrange
    const start = filledBlock(5, 1, 0);

    // act
    const split = describeReset(start, { kind: 'split' });
    const reset = describeReset(start, { kind: 'reset' });

    // assert
    expect(split).toEqual(['Full Body A · 5 exercises', 'Full Body B · 1 exercise']);
    expect(reset).toEqual(split);
  });

  it('names the sessions and cardio that fewer or more training days drop', () => {
    // arrange
    const start = { ...filledBlock(5, 4, 3), cardioSessions: [...Array.from({ length: 3 }, () => cardioPreset('liss', [])), cardioPreset('hiit', [])] };

    // act
    const fewer = describeReset(start, { kind: 'training-days', days: 2 });
    const more = describeReset(start, { kind: 'training-days', days: 5 });

    // assert
    expect(fewer).toEqual(['Full Body C · 3 exercises']);
    expect(more).toEqual(['Easy cardio · 1 segment', 'Intervals · 3 segments']);
  });

  it('names the session a day loses when its kind changes', () => {
    // arrange
    const start = filledBlock(5, 4, 3);

    // act
    const cardioDay = describeReset(start, { kind: 'day', weekday: 'tue' });
    const sessionDay = describeReset(start, { kind: 'day', weekday: 'mon' });
    const restDay = describeReset(start, { kind: 'day', weekday: 'sun' });

    // assert
    expect(cardioDay).toEqual(['Easy cardio · 1 segment']);
    expect(sessionDay).toEqual(['Full Body A · 5 exercises']);
    expect(restDay).toEqual([]);
  });

  it('finds nothing to lose on a day whose strength session has no exercises', () => {
    // act
    const lost = describeReset(block(), { kind: 'day', weekday: 'mon' });

    // assert
    expect(lost).toEqual([]);
  });

  it('names the removed session', () => {
    // arrange
    const start = filledBlock(5, 4, 0);

    // act
    const strength = describeReset(start, { kind: 'remove-session', sessionId: start.sessions[1].id });
    const empty = describeReset(start, { kind: 'remove-session', sessionId: start.sessions[2].id });
    const cardio = describeReset(start, { kind: 'remove-session', sessionId: start.cardioSessions[0].id });

    // assert
    expect(strength).toEqual(['Full Body B · 4 exercises']);
    expect(empty).toEqual([]);
    expect(cardio).toEqual(['Easy cardio · 1 segment']);
  });

  it('names every session and cardio with content when the block is removed', () => {
    // arrange
    const start = filledBlock(5, 0, 2);

    // act
    const lost = describeReset(start, { kind: 'remove-block' });

    // assert
    expect(lost).toEqual(['Full Body A · 5 exercises', 'Full Body C · 2 exercises', 'Easy cardio · 1 segment', 'Easy cardio · 1 segment']);
  });

  it('finds nothing to lose in empty sessions', () => {
    // act
    const lost = describeReset(block(), { kind: 'split' });

    // assert
    expect(lost).toEqual([]);
  });
});
