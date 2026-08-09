// Intentionally violates the app-alias rule so tools/lint-boundaries.test.mjs can prove
// the rule still matches this directory. Never import this file from product code.
import { lintFixtureTarget } from "../../target";

export const fixtureValue = lintFixtureTarget;
