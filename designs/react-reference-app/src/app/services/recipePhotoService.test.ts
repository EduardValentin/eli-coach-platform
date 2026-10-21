import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { RECIPE_PHOTO_NOT_UPLOADED, RecipePhotoServer } from './recipePhotoService';
import { PREPARING_MS } from './resourceService';

const AN_HOUR_MS = 60 * 60 * 1000;

const bowlPhoto = () => new File(['photo'], 'bowl.jpg', { type: 'image/jpeg' });

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

describe('uploading a recipe photo', () => {
  it('answers with the stored photo address', async () => {
    // arrange
    const server = new RecipePhotoServer();

    // act
    const pending = server.upload(bowlPhoto(), { outcome: 'works' });
    await vi.advanceTimersByTimeAsync(PREPARING_MS);

    // assert
    await expect(pending).resolves.toEqual({ status: 'stored', url: 'blob:bowl.jpg' });
  });

  it('fails when the upload does not go through', async () => {
    // arrange
    const server = new RecipePhotoServer();
    const failure = expect(server.upload(bowlPhoto(), { outcome: 'fails' })).rejects.toThrow(
      RECIPE_PHOTO_NOT_UPLOADED,
    );

    // act
    await vi.advanceTimersByTimeAsync(PREPARING_MS);

    // assert
    await failure;
  });

  it('refuses the file as not a photo', async () => {
    // arrange
    const server = new RecipePhotoServer();
    const pending = server.upload(bowlPhoto(), { outcome: 'refused' });

    // act
    await vi.advanceTimersByTimeAsync(PREPARING_MS);

    // assert
    await expect(pending).resolves.toEqual({ status: 'refused', refusal: 'unsupported' });
  });

  it('holds without ever answering', async () => {
    // arrange
    const server = new RecipePhotoServer();
    const pending = tracked(server.upload(bowlPhoto(), { outcome: 'holds' }));

    // act
    await vi.advanceTimersByTimeAsync(AN_HOUR_MS);

    // assert
    expect(pending.settled()).toBe(false);
  });

  it.each([
    ['works', 'stored'],
    ['refused', 'refused'],
  ] as const)('answers a held save the way the newly chosen %s outcome says', async (outcome, status) => {
    // arrange
    const server = new RecipePhotoServer();
    const pending = server.upload(bowlPhoto(), { outcome: 'holds' });
    await vi.advanceTimersByTimeAsync(AN_HOUR_MS);

    // act
    server.releaseHeldUploads(outcome);
    await vi.advanceTimersByTimeAsync(PREPARING_MS);

    // assert
    await expect(pending).resolves.toHaveProperty('status', status);
  });

  it('fails a held save when the newly chosen outcome fails', async () => {
    // arrange
    const server = new RecipePhotoServer();
    const failure = expect(server.upload(bowlPhoto(), { outcome: 'holds' })).rejects.toThrow(
      RECIPE_PHOTO_NOT_UPLOADED,
    );
    await vi.advanceTimersByTimeAsync(AN_HOUR_MS);

    // act
    server.releaseHeldUploads('fails');
    await vi.advanceTimersByTimeAsync(PREPARING_MS);

    // assert
    await failure;
  });

  it('keeps holding while the chosen outcome is still to hold', async () => {
    // arrange
    const server = new RecipePhotoServer();
    const pending = tracked(server.upload(bowlPhoto(), { outcome: 'holds' }));
    await vi.advanceTimersByTimeAsync(AN_HOUR_MS);

    // act
    server.releaseHeldUploads('holds');
    await vi.advanceTimersByTimeAsync(AN_HOUR_MS);

    // assert
    expect(pending.settled()).toBe(false);
  });
});
