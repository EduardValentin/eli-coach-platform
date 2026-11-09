export type TermsDocumentDto = {
  filename: string;
  contentType: string;
  content: Uint8Array;
};

export interface TermsFacade {
  currentTerms(): { version: string; hash: string };
  termsDocument(version: string): TermsDocumentDto | null;
}
