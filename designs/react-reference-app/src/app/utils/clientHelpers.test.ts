import { describe, expect, it } from 'vitest';
import { trainingClientIdFor } from './clientHelpers';

describe('trainingClientIdFor', () => {
  it('maps the roster alias id to the training data id', () => {
    expect(trainingClientIdFor('c1')).toBe('client-1');
  });

  it('returns any other id unchanged', () => {
    expect(trainingClientIdFor('c2')).toBe('c2');
    expect(trainingClientIdFor('client-1')).toBe('client-1');
  });
});
