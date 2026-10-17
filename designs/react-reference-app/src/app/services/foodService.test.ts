import { describe, expect, it, vi } from 'vitest';
import { FOOD_NOT_SAVED, saveFoodThroughServer } from './foodService';

describe('saving a food through the mocked server', () => {
  it('writes the food when the server answers', () => {
    // arrange
    const write = vi.fn();

    // act
    saveFoodThroughServer('ok', write);

    // assert
    expect(write).toHaveBeenCalledOnce();
  });

  it('writes nothing and reports the failure when the server fails', () => {
    // arrange
    const write = vi.fn();

    // act
    const attempt = () => saveFoodThroughServer('fail', write);

    // assert
    expect(attempt).toThrow(FOOD_NOT_SAVED);
    expect(write).not.toHaveBeenCalled();
  });
});
