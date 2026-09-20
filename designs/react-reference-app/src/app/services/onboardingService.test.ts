import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyOnboardingDraft, type OnboardingDraft } from '../domain/journey';
import {
  answerRequest,
  DRAFT_STORAGE_KEY,
  forgetDraft,
  loadDraft,
  saveDraft,
  SIMULATED_LATENCY_MS,
  submit,
} from './onboardingService';

function draftOnForm(index: number): OnboardingDraft {
  const draft = emptyOnboardingDraft();

  return {
    ...draft,
    currentFormIndex: index,
    answers: {
      ...draft.answers,
      'goal-availability': { goal: 'Fat loss', daysPerWeek: 3 },
    },
  };
}

beforeEach(() => {
  window.localStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  window.localStorage.clear();
});

describe('saving an onboarding draft', () => {
  it('gives back the draft it stored', async () => {
    // arrange
    const saving = saveDraft('ac-1', draftOnForm(2));

    // act
    await vi.advanceTimersByTimeAsync(SIMULATED_LATENCY_MS);

    // assert
    await expect(saving).resolves.toEqual(draftOnForm(2));
  });

  it('resumes on the form she left, with her answers', async () => {
    // arrange
    const saving = saveDraft('ac-1', draftOnForm(3));

    // act
    await vi.advanceTimersByTimeAsync(SIMULATED_LATENCY_MS);
    await saving;

    // assert
    expect(loadDraft('ac-1')).toEqual(draftOnForm(3));
  });

  it('keeps one journey draft apart from another', async () => {
    // arrange
    const first = saveDraft('ac-1', draftOnForm(1));
    await vi.advanceTimersByTimeAsync(SIMULATED_LATENCY_MS);
    await first;

    // act
    const second = saveDraft('ac-2', draftOnForm(4));
    await vi.advanceTimersByTimeAsync(SIMULATED_LATENCY_MS);
    await second;

    // assert
    expect(loadDraft('ac-1')).toEqual(draftOnForm(1));
    expect(loadDraft('ac-2')).toEqual(draftOnForm(4));
  });

  it('mirrors every draft under one storage key', async () => {
    // arrange
    const saving = saveDraft('ac-1', draftOnForm(0));

    // act
    await vi.advanceTimersByTimeAsync(SIMULATED_LATENCY_MS);
    await saving;

    // assert
    expect(Object.keys(window.localStorage)).toEqual([DRAFT_STORAGE_KEY]);
  });

  it('has nothing to resume for a journey that never saved', () => {
    // arrange
    const journeyId = 'ac-never-started';

    // act
    const draft = loadDraft(journeyId);

    // assert
    expect(draft).toBeNull();
  });

  it('forgets a draft once it is no longer hers to resume', async () => {
    // arrange
    const saving = saveDraft('ac-1', draftOnForm(2));
    await vi.advanceTimersByTimeAsync(SIMULATED_LATENCY_MS);
    await saving;

    // act
    forgetDraft('ac-1');

    // assert
    expect(loadDraft('ac-1')).toBeNull();
  });
});

describe('submitting onboarding', () => {
  it('dates the submission against the journey', async () => {
    // arrange
    const submitting = submit('ac-1');

    // act
    await vi.advanceTimersByTimeAsync(SIMULATED_LATENCY_MS);

    // assert
    const submitted = await submitting;
    expect(submitted.journeyId).toBe('ac-1');
    expect(submitted.submittedAt).toBeInstanceOf(Date);
  });
});

describe('answering a request for more details', () => {
  it('returns only the answers the coach asked about', async () => {
    // arrange
    const request = {
      questionIds: ['sleep', 'injuries'],
      message: 'Tell me a little more about your sleep.',
      createdAt: new Date(2026, 0, 10, 12),
    };
    const answering = answerRequest('ac-1', request, {
      sleep: 'Six hours',
      injuries: 'None',
      goal: 'Fat loss',
    });

    // act
    await vi.advanceTimersByTimeAsync(SIMULATED_LATENCY_MS);

    // assert
    const answered = await answering;
    expect(answered.answers).toEqual({ sleep: 'Six hours', injuries: 'None' });
  });

  it('records an unanswered question as empty rather than dropping it', async () => {
    // arrange
    const request = {
      questionIds: ['sleep', 'injuries'],
      message: 'Tell me a little more about your sleep.',
      createdAt: new Date(2026, 0, 10, 12),
    };
    const answering = answerRequest('ac-1', request, { sleep: 'Six hours' });

    // act
    await vi.advanceTimersByTimeAsync(SIMULATED_LATENCY_MS);

    // assert
    await expect(answering).resolves.toMatchObject({
      answers: { sleep: 'Six hours', injuries: null },
    });
  });
});
