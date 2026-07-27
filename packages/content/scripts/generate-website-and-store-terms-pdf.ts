import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  CURRENT_WEBSITE_AND_STORE_TERMS,
  websiteAndStoreTermsPdfArtifactPath,
} from "../src/website-and-store-terms";
import { ensureVersionedTermsPdf } from "../tooling/ensure-versioned-terms-pdf";
import { renderLegalDocumentPdf } from "../tooling/render-legal-document-pdf";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const document = CURRENT_WEBSITE_AND_STORE_TERMS.document;
const relativePdfPath = websiteAndStoreTermsPdfArtifactPath(document.version);
const pdfPath = resolve(repositoryRoot, "packages/content", relativePdfPath);
const pdfBytes = await renderLegalDocumentPdf(document);
const status = await ensureVersionedTermsPdf({ pdfPath, pdfBytes });

console.log(`${status}: ${relativePdfPath}`);
