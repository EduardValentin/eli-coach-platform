// Intentionally violates R6 so tools/lint-boundaries.test.mjs can prove the store
// feature's ui/** block binds. The store has no real UI yet — it moves out of
// routes/marketing/store/ in PR 5 — and this fixture proves the browser-bundle
// fence is already in place for it. Never import this from product code.
import { PostgresStoreCatalogRepository } from "~/features/store/data/catalog-repository.server";

export const fixtureValue = PostgresStoreCatalogRepository;
