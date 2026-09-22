import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { firstInvalidField, useBookingDetailsForm } from './useBookingDetailsForm';

const TODAY = new Date('2026-03-02T06:00:00.000Z');

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(TODAY);
});

afterEach(() => {
  vi.useRealTimers();
});

function completeForm(form: ReturnType<typeof useBookingDetailsForm>) {
  form.setFirstName('Jane');
  form.setLastName('Doe');
  form.setEmail('jane@example.com');
  form.setDateOfBirth('1994-03-14');
  form.setGender('female');
  form.setPrimaryGoal('build_strength');
  form.setCountry('RO');
}

describe('useBookingDetailsForm', () => {
  it('reports every mandatory field when the form is empty, in page order', () => {
    // arrange
    const { result } = renderHook(() => useBookingDetailsForm());

    // act
    let errors: ReturnType<typeof result.current.validate> = {};
    act(() => {
      errors = result.current.validate();
    });

    // assert
    expect(errors).toEqual({
      firstName: 'Enter your first name, up to 60 characters.',
      lastName: 'Enter your last name, up to 60 characters.',
      email: 'Enter a valid email address.',
      dateOfBirth: 'Choose your date of birth.',
      gender: 'Choose an option.',
      primaryGoal: 'Choose your primary goal.',
      country: 'Choose your country.',
    });
    expect(firstInvalidField(errors)).toBe('firstName');
  });

  it('accepts a complete form with an empty phone and reports no error', () => {
    // arrange
    const { result } = renderHook(() => useBookingDetailsForm());

    // act
    act(() => completeForm(result.current));
    let errors: ReturnType<typeof result.current.validate> = {};
    act(() => {
      errors = result.current.validate();
    });

    // assert
    expect(errors).toEqual({});
    expect(result.current.phoneCountry).toBe('RO');
  });

  it('refuses a visitor under 18 and an implausible phone', () => {
    // arrange
    const { result } = renderHook(() => useBookingDetailsForm());

    // act
    act(() => {
      completeForm(result.current);
      result.current.setDateOfBirth('2008-03-03');
      result.current.setPhoneNumber('12ab');
    });
    let errors: ReturnType<typeof result.current.validate> = {};
    act(() => {
      errors = result.current.validate();
    });

    // assert
    expect(errors).toEqual({
      dateOfBirth: 'You must be at least 18 to book a call.',
      phone:
        'Enter a phone number with digits only, 4 to 14 digits after the country code.',
    });
  });

  it('preselects the calling code from the country until the visitor changes the code herself', () => {
    // arrange
    const { result } = renderHook(() => useBookingDetailsForm());

    // act
    act(() => result.current.setCountry('RO'));
    const afterCountry = result.current.phoneCountry;
    act(() => result.current.setPhoneCountry('GB'));
    act(() => result.current.setCountry('FR'));

    // assert
    expect(afterCountry).toBe('RO');
    expect(result.current.phoneCountry).toBe('GB');
    expect(result.current.country).toBe('FR');
  });
});
