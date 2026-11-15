import { describe, expect, it, vi } from 'vitest';
import { writeProgramThroughServer } from './programWriteService';

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
