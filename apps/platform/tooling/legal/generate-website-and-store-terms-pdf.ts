import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { canonicalizeLegalDocument } from "~/bounded-contexts/legal/legal/domain/legal-document";
import { WEBSITE_AND_STORE_TERMS_DOCUMENT } from "~/bounded-contexts/legal/public";
import { Sha256DocumentHasherAdapter } from "~/shared/documents/sha256-document-hasher-adapter.server";

import { ensureVersionedTermsPdf } from "./ensure-versioned-terms-pdf";
import { renderLegalDocumentPdf } from "./render-legal-document-pdf";
import { websiteAndStoreTermsPdfArtifactPath } from "./website-and-store-terms-artifact";

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const document = WEBSITE_AND_STORE_TERMS_DOCUMENT;
const relativePdfPath = websiteAndStoreTermsPdfArtifactPath(document.version);
const pdfPath = resolve(repositoryRoot, relativePdfPath);
const pdfBytes = await renderLegalDocumentPdf(document);
const status = await ensureVersionedTermsPdf({ pdfPath, pdfBytes });
const contentSha256 = new Sha256DocumentHasherAdapter().hash(
  canonicalizeLegalDocument(document),
);

console.log(`${status}: ${relativePdfPath} (content sha256 ${contentSha256})`);
