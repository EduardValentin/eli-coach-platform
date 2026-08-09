// Intentionally violates R3 so tools/lint-boundaries.test.mjs can prove the store
// feature's cross-feature boundary rule still matches. A non-ui, non-schema store
// file may not reach into another feature's internals. Never import this from
// product code.
import { waitlistEntriesTable } from "~/features/waitlist/data/schema.server";

export const fixtureValue = waitlistEntriesTable;
