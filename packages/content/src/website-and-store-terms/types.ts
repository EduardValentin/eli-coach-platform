import type { LegalDocument } from "../legal-document";

export type PaidDigitalDeliveryConsent = Readonly<{
  statement: string;
  confirmationNotice: string;
  termsVersion: string;
  termsHref: string;
  termsLinkLabel: string;
}>;

export type WebsiteAndStoreTermsPdfArtifact = Readonly<{
  termsVersion: string;
  effectiveDate: string;
  mediaType: "application/pdf";
  filename: "terms-and-conditions.pdf";
  packageExportSubpath: string;
  contentSha256: string;
}>;

export type PublishedWebsiteAndStoreTerms = Readonly<{
  document: LegalDocument;
  consent: PaidDigitalDeliveryConsent;
  artifact: WebsiteAndStoreTermsPdfArtifact;
}>;
