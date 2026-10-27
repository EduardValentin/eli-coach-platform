import {
  WEBSITE_AND_STORE_TERMS_DOCUMENT,
  type TermsFacade,
} from "~/bounded-contexts/legal/public";
import {
  canonicalizeLegalDocument,
  type DocumentHasher,
} from "~/bounded-contexts/legal/legal/domain/legal-document";

export function createTermsFacade(hasher: DocumentHasher): TermsFacade {
  const terms = {
    version: WEBSITE_AND_STORE_TERMS_DOCUMENT.version,
    hash: hasher.hash(
      canonicalizeLegalDocument(WEBSITE_AND_STORE_TERMS_DOCUMENT),
    ),
  };

  return { currentTerms: () => terms };
}
