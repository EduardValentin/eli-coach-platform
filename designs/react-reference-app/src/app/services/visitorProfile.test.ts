import { describe, expect, it } from 'vitest';
import {
  VISITOR_GENDERS,
  VISITOR_PRIMARY_GOALS,
  checkBirthDate,
  formatAgeForCard,
  formatAgeForEmail,
  labelForGender,
  labelForPrimaryGoal,
  normalizePhone,
} from './visitorProfile';

const BOOKING_DAY = new Date('2026-03-02T06:00:00.000Z');

describe('visitor profile vocabulary', () => {
  it('offers the four client-profile genders and the four primary goals', () => {
    // arrange
    // act
    const genders = VISITOR_GENDERS.map((option) => option.label);
    const goals = VISITOR_PRIMARY_GOALS.map((option) => option.label);

    // assert
    expect(genders).toEqual(['Female', 'Male', 'Non-binary', 'Prefer not to say']);
    expect(goals).toEqual([
      'Lose weight',
      'Build muscle',
      'Build strength',
      'Maintain but improve lifestyle',
    ]);
    expect(labelForGender('non_binary')).toBe('Non-binary');
    expect(labelForPrimaryGoal('maintain_improve_lifestyle')).toBe(
      'Maintain but improve lifestyle',
    );
  });
});

describe('normalizePhone', () => {
  it('accepts an empty number as no phone', () => {
    // arrange
    // act
    const result = normalizePhone({ callingCode: '+40', nationalNumber: '   ' });

    // assert
    expect(result).toEqual({ status: 'empty' });
  });

  it('strips separators, drops one leading zero and produces E.164', () => {
    // arrange
    // act
    const result = normalizePhone({
      callingCode: '+40',
      nationalNumber: '(0712) 345-678',
    });

    // assert
    expect(result).toEqual({ status: 'valid', e164: '+40712345678' });
  });

  it('refuses letters, too few digits, too many digits and an E.164 over 15 digits', () => {
    // arrange
    const cases = [
      { callingCode: '+40', nationalNumber: '07ab' },
      { callingCode: '+40', nationalNumber: '123' },
      { callingCode: '+40', nationalNumber: '123456789012345' },
      { callingCode: '+1', nationalNumber: '12345678901234' },
    ];

    // act
    const results = cases.map(normalizePhone);

    // assert
    expect(results.map((result) => result.status)).toEqual([
      'invalid',
      'invalid',
      'invalid',
      'valid',
    ]);
    expect(
      normalizePhone({ callingCode: '+358', nationalNumber: '1234567890123' }),
    ).toEqual({ status: 'invalid' });
  });
});

describe('checkBirthDate', () => {
  it('accepts a visitor who turns 18 on the booking day', () => {
    // arrange
    // act
    const result = checkBirthDate('2008-03-02', BOOKING_DAY);

    // assert
    expect(result).toBe('ok');
  });

  it('refuses a visitor who turns 18 the day after the booking day', () => {
    // arrange
    // act
    const result = checkBirthDate('2008-03-03', BOOKING_DAY);

    // assert
    expect(result).toBe('too_young');
  });

  it('refuses an impossible or implausibly old date', () => {
    // arrange
    // act
    const results = [
      checkBirthDate('1994-02-30', BOOKING_DAY),
      checkBirthDate('1900-01-01', BOOKING_DAY),
      checkBirthDate('', BOOKING_DAY),
    ];

    // assert
    expect(results).toEqual(['impossible', 'impossible', 'impossible']);
  });
});

describe('age formatting', () => {
  it('words the age with the birth date for the card and the email', () => {
    // arrange
    // act
    const card = formatAgeForCard('1994-03-14', BOOKING_DAY);
    const email = formatAgeForEmail('1994-03-14', BOOKING_DAY);

    // assert
    expect(card).toBe('31 (14 Mar 1994)');
    expect(email).toBe('31 (born 14 March 1994)');
  });
});
