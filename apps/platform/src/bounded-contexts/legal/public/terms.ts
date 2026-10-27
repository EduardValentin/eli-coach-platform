export interface TermsFacade {
  currentTerms(): { version: string; hash: string };
}
