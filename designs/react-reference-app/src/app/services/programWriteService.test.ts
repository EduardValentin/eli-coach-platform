import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DRAFT_SAVE_LATENCY_MS, saveDraftThroughServer, writeProgramThroughServer } from './programWriteService';

describe('writing a program through the mocked server', () => {
  it('writes when the server answers', () => {
    // arrange
    const write = vi.fn(() => 'written');

    // act
    const result = writeProgramThroughServer('works', write);

    // assert
    expect(result).toBe('written');
    expect(write).toHaveBeenCalledOnce();
  });

  it('writes nothing and throws when the server fails', () => {
    // arrange
    const write = vi.fn();

    // act
    const attempt = () => writeProgramThroughServer('fails', write);

    // assert
    expect(attempt).toThrow();
    expect(write).not.toHaveBeenCalled();
  });
});

describe('saving a draft through the mocked server', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout'] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('writes the draft and answers saved once the server has answered', async () => {
    // arrange
    const write = vi.fn();
    const pending = saveDraftThroughServer('works', write);
    await vi.advanceTimersByTimeAsync(DRAFT_SAVE_LATENCY_MS - 1);
    expect(write).not.toHaveBeenCalled();

    // act
    await vi.advanceTimersByTimeAsync(1);

    // assert
    await expect(pending).resolves.toBe('saved');
    expect(write).toHaveBeenCalledOnce();
  });

  it('writes nothing and fails when the server does not answer', async () => {
    // arrange
    const write = vi.fn();
    const failure = expect(saveDraftThroughServer('fails', write)).rejects.toThrow();

    // act
    await vi.advanceTimersByTimeAsync(DRAFT_SAVE_LATENCY_MS);

    // assert
    await failure;
    expect(write).not.toHaveBeenCalled();
  });

  it('writes nothing and answers changed elsewhere when a newer draft was saved from another place', async () => {
    // arrange
    const write = vi.fn();
    const pending = saveDraftThroughServer('stale', write);

    // act
    await vi.advanceTimersByTimeAsync(DRAFT_SAVE_LATENCY_MS);

    // assert
    await expect(pending).resolves.toBe('changed-elsewhere');
    expect(write).not.toHaveBeenCalled();
  });
});
