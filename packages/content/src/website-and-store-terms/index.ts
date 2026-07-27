import {
  PAID_DIGITAL_DELIVERY_CONSENT as currentPaidDigitalDeliveryConsent,
  WEBSITE_AND_STORE_TERMS_DOCUMENT,
} from "./current";
import { legalDocumentSha256 } from "../legal-document-hash";

import type { PublishedWebsiteAndStoreTerms } from "./types";

const SAFE_TERMS_VERSION = /^[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?$/;

export function websiteAndStoreTermsPdfArtifactPath(version: string): string {
  if (!SAFE_TERMS_VERSION.test(version)) {
    throw new Error(`Invalid Terms version for artifact path: ${version}`);
  }

  return `artifacts/website-and-store-terms/${version}/terms-and-conditions.pdf`;
}

export function websiteAndStoreTermsPdfPackageExportSubpath(
  version: string,
): string {
  return `./${websiteAndStoreTermsPdfArtifactPath(version)}`;
}

export const CURRENT_WEBSITE_AND_STORE_TERMS = {
  document: WEBSITE_AND_STORE_TERMS_DOCUMENT,
  consent: currentPaidDigitalDeliveryConsent,
  artifact: {
    termsVersion: WEBSITE_AND_STORE_TERMS_DOCUMENT.version,
    effectiveDate: WEBSITE_AND_STORE_TERMS_DOCUMENT.effectiveDate,
    mediaType: "application/pdf",
    filename: "terms-and-conditions.pdf",
    packageExportSubpath: websiteAndStoreTermsPdfPackageExportSubpath(
      WEBSITE_AND_STORE_TERMS_DOCUMENT.version,
    ),
    contentSha256: legalDocumentSha256(WEBSITE_AND_STORE_TERMS_DOCUMENT),
  },
} as const satisfies PublishedWebsiteAndStoreTerms;
export const WEBSITE_AND_STORE_TERMS_VERSION =
  CURRENT_WEBSITE_AND_STORE_TERMS.document.version;
export const WEBSITE_AND_STORE_TERMS_CONTENT_SHA256 =
  CURRENT_WEBSITE_AND_STORE_TERMS.artifact.contentSha256;
export const PAID_DIGITAL_DELIVERY_CONSENT =
  CURRENT_WEBSITE_AND_STORE_TERMS.consent;
export const WEBSITE_AND_STORE_TERMS_PDF_ARTIFACT =
  CURRENT_WEBSITE_AND_STORE_TERMS.artifact;
