import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { EXERCISE_VIDEO_NOT_UPLOADED, ExerciseVideoServer } from './exerciseVideoService';
import { PREPARING_MS, UPLOAD_STEPS, UPLOAD_STEP_MS } from './resourceService';

const UPLOAD_TIME = UPLOAD_STEPS * UPLOAD_STEP_MS;
const ANSWER_TIME = UPLOAD_TIME + PREPARING_MS;
const AN_HOUR_MS = 60 * 60 * 1000;

const squatDemo = () => new File(['clip'], 'squat.mp4', { type: 'video/mp4' });

function tracked<T>(pending: Promise<T>): { settled: () => boolean } {
  let done = false;
  pending.then(
    () => {
      done = true;
    },
    () => {
      done = true;
    },
  );

  return { settled: () => done };
}

beforeAll(() => {
  URL.createObjectURL = vi.fn((file: Blob) => `blob:${(file as File).name}`);
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout'] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('uploading an exercise video', () => {
  it('reports every sent step and answers with the stored video address', async () => {
    // arrange
    const server = new ExerciseVideoServer();
    const progress: number[] = [];

    // act
    const pending = server.upload(squatDemo(), {
      outcome: 'works',
      onProgress: (fraction) => progress.push(fraction),
    });
    await vi.advanceTimersByTimeAsync(ANSWER_TIME);

    // assert
    await expect(pending).resolves.toBe('blob:squat.mp4');
    expect(progress).toEqual([0.2, 0.4, 0.6, 0.8, 1]);
  });

  it('fails once every byte is sent when the upload does not go through', async () => {
    // arrange
    const server = new ExerciseVideoServer();
    const failure = expect(
      server.upload(squatDemo(), { outcome: 'fails', onProgress: () => undefined }),
    ).rejects.toThrow(EXERCISE_VIDEO_NOT_UPLOADED);

    // act
    await vi.advanceTimersByTimeAsync(UPLOAD_TIME);

    // assert
    await failure;
  });

  it('holds while storing, once every byte is sent, without ever answering', async () => {
    // arrange
    const server = new ExerciseVideoServer();
    const progress: number[] = [];
    const pending = tracked(
      server.upload(squatDemo(), {
        outcome: 'holds',
        onProgress: (fraction) => progress.push(fraction),
      }),
    );

    // act
    await vi.advanceTimersByTimeAsync(AN_HOUR_MS);

    // assert
    expect(progress.at(-1)).toBe(1);
    expect(pending.settled()).toBe(false);
  });

  it.each([
    ['stores', 'works', 'blob:squat.mp4'],
    ['fails', 'fails', null],
  ] as const)('%s a held upload when the newly chosen outcome says so', async (_answer, outcome, address) => {
    // arrange
    const server = new ExerciseVideoServer();
    const pending = server.upload(squatDemo(), { outcome: 'holds', onProgress: () => undefined });
    const answered = address
      ? expect(pending).resolves.toBe(address)
      : expect(pending).rejects.toThrow(EXERCISE_VIDEO_NOT_UPLOADED);
    await vi.advanceTimersByTimeAsync(UPLOAD_TIME);

    // act
    server.releaseHeldUploads(outcome);

    // assert
    await answered;
  });

  it('keeps holding while the chosen outcome is still to hold', async () => {
    // arrange
    const server = new ExerciseVideoServer();
    const pending = tracked(
      server.upload(squatDemo(), { outcome: 'holds', onProgress: () => undefined }),
    );
    await vi.advanceTimersByTimeAsync(UPLOAD_TIME);

    // act
    server.releaseHeldUploads('holds');
    await vi.advanceTimersByTimeAsync(AN_HOUR_MS);

    // assert
    expect(pending.settled()).toBe(false);
  });
});
