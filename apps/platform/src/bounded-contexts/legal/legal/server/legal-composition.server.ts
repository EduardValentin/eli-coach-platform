import type { TermsFacade } from "~/bounded-contexts/legal/public";
import { createTermsFacade } from "~/bounded-contexts/legal/legal/adapters/inbound/facades/terms.server";
import type { DocumentHasher } from "~/bounded-contexts/legal/legal/domain/legal-document";

export type LegalFeature = {
  terms: TermsFacade;
};

export type LegalFeatureHandles = {
  documentHasher: DocumentHasher;
};

export function composeLegalFeature(
  handles: LegalFeatureHandles,
): LegalFeature {
  return { terms: createTermsFacade(handles.documentHasher) };
}
