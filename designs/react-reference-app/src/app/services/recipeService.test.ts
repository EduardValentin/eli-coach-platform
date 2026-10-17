import { describe, expect, it, vi } from 'vitest';
import { RECIPE_NOT_SAVED, saveRecipeThroughServer } from './recipeService';

describe('saving a recipe through the mocked server', () => {
  it('writes the recipe when the server answers', () => {
    // arrange
    const write = vi.fn();

    // act
    saveRecipeThroughServer('ok', write);

    // assert
    expect(write).toHaveBeenCalledOnce();
  });

  it('writes nothing and reports the failure when the server fails', () => {
    // arrange
    const write = vi.fn();

    // act
    const attempt = () => saveRecipeThroughServer('fail', write);

    // assert
    expect(attempt).toThrow(RECIPE_NOT_SAVED);
    expect(write).not.toHaveBeenCalled();
  });
});
