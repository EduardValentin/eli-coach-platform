import { WEBSITE_AND_STORE_TERMS_V1_0_ARTIFACT } from "./versions/1.0.manifest";
import {
  PAID_DIGITAL_DELIVERY_CONSENT_V1_0,
  WEBSITE_AND_STORE_TERMS_V1_0_DOCUMENT,
} from "./versions/1.0";

import type { PublishedWebsiteAndStoreTerms } from "./types";

const WEBSITE_AND_STORE_TERMS_V1_0 = {
  document: WEBSITE_AND_STORE_TERMS_V1_0_DOCUMENT,
  consent: PAID_DIGITAL_DELIVERY_CONSENT_V1_0,
  artifact: WEBSITE_AND_STORE_TERMS_V1_0_ARTIFACT,
} as const satisfies PublishedWebsiteAndStoreTerms;

export const WEBSITE_AND_STORE_TERMS_VERSIONS = {
  "1.0": WEBSITE_AND_STORE_TERMS_V1_0,
} as const satisfies Readonly<Record<string, PublishedWebsiteAndStoreTerms>>;

export const CURRENT_WEBSITE_AND_STORE_TERMS =
  WEBSITE_AND_STORE_TERMS_VERSIONS["1.0"];
export const WEBSITE_AND_STORE_TERMS_VERSION =
  CURRENT_WEBSITE_AND_STORE_TERMS.document.version;
export const WEBSITE_AND_STORE_TERMS_CONTENT_SHA256 =
  CURRENT_WEBSITE_AND_STORE_TERMS.artifact.contentSha256;
export const PAID_DIGITAL_DELIVERY_CONSENT =
  CURRENT_WEBSITE_AND_STORE_TERMS.consent;
export const WEBSITE_AND_STORE_TERMS_PDF_ARTIFACT =
  CURRENT_WEBSITE_AND_STORE_TERMS.artifact;
