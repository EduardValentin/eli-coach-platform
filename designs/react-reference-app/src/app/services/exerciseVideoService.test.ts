import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { EXERCISE_VIDEO_NOT_UPLOADED, ExerciseVideoServer, HELD_UPLOAD_STEP } from './exerciseVideoService';
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
    await expect(pending).resolves.toEqual({ status: 'stored', url: 'blob:squat.mp4' });
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

  it('refuses the file as not a video once it has stored it', async () => {
    // arrange
    const server = new ExerciseVideoServer();
    const progress: number[] = [];
    const pending = server.upload(squatDemo(), {
      outcome: 'refused',
      onProgress: (fraction) => progress.push(fraction),
    });

    // act
    await vi.advanceTimersByTimeAsync(ANSWER_TIME);

    // assert
    await expect(pending).resolves.toEqual({ status: 'refused', refusal: 'unsupported' });
    expect(progress.at(-1)).toBe(1);
  });

  it.each([
    ['part way through the upload', 'holds-uploading', HELD_UPLOAD_STEP / UPLOAD_STEPS],
    ['while storing, once every byte is sent', 'holds-finishing', 1],
  ] as const)('holds %s without ever answering', async (_where, outcome, lastProgress) => {
    // arrange
    const server = new ExerciseVideoServer();
    const progress: number[] = [];
    const pending = tracked(
      server.upload(squatDemo(), { outcome, onProgress: (fraction) => progress.push(fraction) }),
    );

    // act
    await vi.advanceTimersByTimeAsync(AN_HOUR_MS);

    // assert
    expect(progress.at(-1)).toBe(lastProgress);
    expect(pending.settled()).toBe(false);
  });

  it.each([
    ['holds-uploading', 'works'],
    ['holds-finishing', 'works'],
    ['holds-uploading', 'refused'],
    ['holds-finishing', 'refused'],
  ] as const)('answers a save held by %s the way the newly chosen %s outcome says', async (held, outcome) => {
    // arrange
    const server = new ExerciseVideoServer();
    const pending = server.upload(squatDemo(), { outcome: held, onProgress: () => undefined });
    await vi.advanceTimersByTimeAsync(AN_HOUR_MS);

    // act
    server.releaseHeldUploads(outcome);
    await vi.advanceTimersByTimeAsync(ANSWER_TIME);

    // assert
    await expect(pending).resolves.toHaveProperty('status', outcome === 'works' ? 'stored' : 'refused');
  });

  it.each(['holds-uploading', 'holds-finishing'] as const)(
    'fails a save held by %s when the newly chosen outcome fails',
    async (held) => {
      // arrange
      const server = new ExerciseVideoServer();
      const pending = server.upload(squatDemo(), { outcome: held, onProgress: () => undefined });
      const failure = expect(pending).rejects.toThrow(EXERCISE_VIDEO_NOT_UPLOADED);
      await vi.advanceTimersByTimeAsync(AN_HOUR_MS);

      // act
      server.releaseHeldUploads('fails');
      await vi.advanceTimersByTimeAsync(ANSWER_TIME);

      // assert
      await failure;
    },
  );

  it('moves a save held while uploading on to holding while finishing', async () => {
    // arrange
    const server = new ExerciseVideoServer();
    const progress: number[] = [];
    const pending = tracked(
      server.upload(squatDemo(), {
        outcome: 'holds-uploading',
        onProgress: (fraction) => progress.push(fraction),
      }),
    );
    await vi.advanceTimersByTimeAsync(AN_HOUR_MS);

    // act
    server.releaseHeldUploads('holds-finishing');
    await vi.advanceTimersByTimeAsync(AN_HOUR_MS);

    // assert
    expect(progress.at(-1)).toBe(1);
    expect(pending.settled()).toBe(false);
  });

  it('keeps holding while the chosen outcome is still to hold', async () => {
    // arrange
    const server = new ExerciseVideoServer();
    const pending = tracked(
      server.upload(squatDemo(), { outcome: 'holds-finishing', onProgress: () => undefined }),
    );
    await vi.advanceTimersByTimeAsync(UPLOAD_TIME);

    // act
    server.releaseHeldUploads('holds-uploading');
    await vi.advanceTimersByTimeAsync(AN_HOUR_MS);

    // assert
    expect(pending.settled()).toBe(false);
  });
});
