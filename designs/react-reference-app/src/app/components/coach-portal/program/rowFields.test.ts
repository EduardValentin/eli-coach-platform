import { describe, expect, it } from 'vitest';
import { formatRange, formatRest, parseRange, parseRest } from './rowFields';

describe('rowFields', () => {
  it('formats a range with an en dash and a single value when both ends match', () => {
    // arrange
    const range = { min: 6, max: 10 };
    const single = { min: 8, max: 8 };

    // act
    const texts = [formatRange(range), formatRange(single)];

    // assert
    expect(texts).toEqual(['6–10', '8']);
  });

  it('parses a range typed with a hyphen, an en dash or a single number', () => {
    // arrange
    const typed = ['6-10', '6–10', '8', ' 6 - 10 '];

    // act
    const ranges = typed.map(parseRange);

    // assert
    expect(ranges).toEqual([
      { min: 6, max: 10 },
      { min: 6, max: 10 },
      { min: 8, max: 8 },
      { min: 6, max: 10 },
    ]);
  });

  it('refuses a range that is not a number or runs backwards', () => {
    // arrange
    const typed = ['', 'abc', '10-6', '6-', '-1'];

    // act
    const ranges = typed.map(parseRange);

    // assert
    expect(ranges).toEqual([null, null, null, null, null]);
  });

  it('formats rest as minutes and seconds from a minute up and as seconds below', () => {
    // arrange
    const seconds = [150, 60, 45];

    // act
    const texts = seconds.map(formatRest);

    // assert
    expect(texts).toEqual(['2:30', '1:00', '45 s']);
  });

  it('parses rest typed as m:ss or as plain seconds', () => {
    // arrange
    const typed = ['2:30', '150', '90', '45 s'];

    // act
    const seconds = typed.map(parseRest);

    // assert
    expect(seconds).toEqual([150, 150, 90, 45]);
  });

  it('refuses rest that is not seconds or m:ss', () => {
    // arrange
    const typed = ['', 'soon', '2:3', '2:75', '-5'];

    // act
    const seconds = typed.map(parseRest);

    // assert
    expect(seconds).toEqual([null, null, null, null, null]);
  });
});
