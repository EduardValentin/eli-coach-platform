import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { WEBSITE_AND_STORE_TERMS_V1_0_DOCUMENT } from "../src/website-and-store-terms/versions/1.0";
import { publishVersionedTermsArtifact } from "../tooling/website-and-store-terms-artifact";
import { renderLegalDocumentPdf } from "../tooling/render-legal-document-pdf";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const pdfBytes = await renderLegalDocumentPdf(WEBSITE_AND_STORE_TERMS_V1_0_DOCUMENT);
const publication = await publishVersionedTermsArtifact({
  document: WEBSITE_AND_STORE_TERMS_V1_0_DOCUMENT,
  pdfBytes,
  paths: {
    pdfPath: resolve(
      repositoryRoot,
      "packages/content/artifacts/website-and-store-terms/1.0/terms-and-conditions.pdf",
    ),
    manifestPath: resolve(
      repositoryRoot,
      "packages/content/src/website-and-store-terms/versions/1.0.manifest.ts",
    ),
  },
});

console.log(publication.status);
