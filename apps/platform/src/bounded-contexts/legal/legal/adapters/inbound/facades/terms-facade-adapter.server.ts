import {
  WEBSITE_AND_STORE_TERMS_DOCUMENT,
  type TermsFacade,
} from "~/bounded-contexts/legal/public";
import {
  canonicalizeLegalDocument,
  type DocumentHasherPort,
} from "~/bounded-contexts/legal/legal/domain/legal-document";

export class TermsFacadeAdapter implements TermsFacade {
  private readonly terms;

  constructor(private readonly documentHasherPort: DocumentHasherPort) {
    this.terms = {
      version: WEBSITE_AND_STORE_TERMS_DOCUMENT.version,
      hash: this.documentHasherPort.hash(
        canonicalizeLegalDocument(WEBSITE_AND_STORE_TERMS_DOCUMENT),
      ),
    };
  }

  currentTerms() {
    return this.terms;
  }
}
