import {
  PAID_DIGITAL_DELIVERY_CONSENT,
  WEBSITE_AND_STORE_TERMS_DOCUMENT,
} from "./current";
import { legalDocumentSha256 } from "../legal-document-hash";

import type { PublishedWebsiteAndStoreTerms } from "./types";

export {
  PAID_DIGITAL_DELIVERY_CONSENT,
  WEBSITE_AND_STORE_TERMS_DOCUMENT,
};
export type {
  PaidDigitalDeliveryConsent,
  PublishedWebsiteAndStoreTerms,
  WebsiteAndStoreTermsPdfArtifact,
} from "./types";

const SAFE_TERMS_VERSION = /^[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?$/;

export function websiteAndStoreTermsPdfArtifactPath(version: string): string {
  if (!SAFE_TERMS_VERSION.test(version)) {
    throw new Error(`Invalid Terms version for artifact path: ${version}`);
  }

  return `artifacts/website-and-store-terms/${version}/terms-and-conditions.pdf`;
}

export const CURRENT_WEBSITE_AND_STORE_TERMS = {
  document: WEBSITE_AND_STORE_TERMS_DOCUMENT,
  consent: PAID_DIGITAL_DELIVERY_CONSENT,
  artifact: {
    termsVersion: WEBSITE_AND_STORE_TERMS_DOCUMENT.version,
    effectiveDate: WEBSITE_AND_STORE_TERMS_DOCUMENT.effectiveDate,
    mediaType: "application/pdf",
    filename: "terms-and-conditions.pdf",
    packageExportSubpath:
      `./${websiteAndStoreTermsPdfArtifactPath(WEBSITE_AND_STORE_TERMS_DOCUMENT.version)}`,
    contentSha256: legalDocumentSha256(WEBSITE_AND_STORE_TERMS_DOCUMENT),
  },
} as const satisfies PublishedWebsiteAndStoreTerms;
