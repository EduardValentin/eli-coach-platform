import { fileURLToPath } from "node:url";

import { WEBSITE_AND_STORE_TERMS_VERSIONS } from "../src/website-and-store-terms";
import {
  assertPublishedTermsHistoryIsAppendOnly,
  resolvePublishedTermsMergeBase,
  termsHistoryBaseRefFromArgs,
} from "../tooling/published-website-and-store-terms-history";

const repositoryRoot = fileURLToPath(new URL("../../..", import.meta.url));

async function main(): Promise<void> {
  const baseRef = termsHistoryBaseRefFromArgs(process.argv.slice(2));
  const baseSha = await resolvePublishedTermsMergeBase({
    baseRef,
    repositoryRoot,
  });

  await assertPublishedTermsHistoryIsAppendOnly({
    baseSha,
    currentVersions: Object.keys(WEBSITE_AND_STORE_TERMS_VERSIONS),
    repositoryRoot,
  });

  console.info(`Published Terms history is append-only from ${baseSha}.`);
}

await main();
