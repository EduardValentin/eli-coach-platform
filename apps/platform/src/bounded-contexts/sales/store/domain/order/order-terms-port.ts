type TermsDocument = {
  filename: string;
  contentType: string;
  content: Uint8Array;
};

export type OrderTerms = {
  version: string;
  document: TermsDocument;
  linkLabel: string;
  path: string;
  deliveryConsentStatement: string;
  deliveryConfirmationNotice: string;
};

export interface OrderTermsPort {
  find(version: string): OrderTerms | null;
}
