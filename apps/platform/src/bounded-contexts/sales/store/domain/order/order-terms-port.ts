type TermsDocument = {
  filename: string;
  contentType: string;
  content: Uint8Array;
};

export type OrderTerms = {
  version: string;
  document: TermsDocument;
  deliveryConfirmationNotice: string;
};

export interface OrderTermsPort {
  find(version: string): OrderTerms | null;
}
