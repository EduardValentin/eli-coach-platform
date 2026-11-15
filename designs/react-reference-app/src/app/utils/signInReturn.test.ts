import { describe, expect, it } from 'vitest';
import { keepingSignInReturn, signInPathReturningTo, signInReturnTarget } from './signInReturn';

describe('the sign-in return', () => {
  it('round-trips the page a signed-out visitor asked for', () => {
    // arrange
    const asked = { pathname: '/portal/exercises/e1', search: '?pseed=published' };

    // act
    const signInPath = signInPathReturningTo(asked);

    // assert
    expect(signInReturnTarget(new URL(signInPath, 'https://evoa.test').search)).toBe('/portal/exercises/e1?pseed=published');
  });

  it.each(['https://elsewhere.test/portal', '//elsewhere.test/portal', '/\\elsewhere.test'])('refuses %s as a return target', target => {
    // arrange
    const search = `?${new URLSearchParams({ redirect_url: target })}`;

    // act
    const returnTarget = signInReturnTarget(search);

    // assert
    expect(returnTarget).toBeNull();
  });

  it('carries the return through the sign-in failure page', () => {
    // arrange
    const { search } = new URL(signInPathReturningTo({ pathname: '/portal/exercises/e1', search: '' }), 'https://evoa.test');

    // act
    const failurePath = keepingSignInReturn('/sign-in-failed', search);

    // assert
    expect(failurePath).toBe('/sign-in-failed?redirect_url=%2Fportal%2Fexercises%2Fe1');
    expect(keepingSignInReturn('/sign-in-failed', '')).toBe('/sign-in-failed');
  });
});
