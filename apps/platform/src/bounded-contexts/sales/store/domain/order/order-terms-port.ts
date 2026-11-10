type TermsDocument = {
  filename: string;
  contentType: string;
  content: Uint8Array;
};

export type OrderTerms = {
  version: string;
  document: TermsDocument;
};

export interface OrderTermsPort {
  find(version: string): OrderTerms | null;
}
