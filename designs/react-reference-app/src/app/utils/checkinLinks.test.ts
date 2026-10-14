import { describe, expect, it } from 'vitest';
import {
  checkinAnchorId,
  checkinIdFromSearch,
  coachCheckinPath,
  coachCheckinsPath,
} from './checkinLinks';

describe('checkinLinks', () => {
  it('links the check-ins page without a target', () => {
    expect(coachCheckinsPath()).toBe('/coach/checkins');
  });

  it('round-trips a check-in id through the deep link', () => {
    const path = coachCheckinPath('ci 3');
    const search = new URLSearchParams(path.slice(path.indexOf('?')));

    expect(path.startsWith('/coach/checkins?')).toBe(true);
    expect(checkinIdFromSearch(search)).toBe('ci 3');
  });

  it('reads no target from a plain visit', () => {
    expect(checkinIdFromSearch(new URLSearchParams(''))).toBeNull();
  });

  it('names the anchor after the check-in', () => {
    expect(checkinAnchorId('c1')).toBe('checkin-c1');
  });
});
