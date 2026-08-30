/**
 * Fixtures for the suites that load a runtime environment. This is a declared
 * subpath of its own — never the package barrel — because the barrel is a
 * production contract, and nothing here would survive the tests being
 * deleted. `eslint.config.mjs` exempts this one subpath from the
 * import-through-the-barrel rule for exactly that reason.
 */

/**
 * Clerk credentials shaped exactly like real ones but belonging to no Clerk
 * instance — enough to satisfy the three required Clerk fields wherever a test
 * loads a runtime environment. Suites in two workspace packages need the same
 * triple, so it is published once here instead of copied into each of them.
 */
export const CLERK_TEST_ENVIRONMENT = {
  CLERK_PUBLISHABLE_KEY: "pk_test_ZXhhbXBsZS5jbGVyay5hY2NvdW50cy5kZXYk",
  CLERK_SECRET_KEY: "sk_test_1234567890abcdefghijklmnopqrstuvwxyz",
  CLERK_SIGN_IN_URL: "https://evoa.fit/sign-in",
} as const;
