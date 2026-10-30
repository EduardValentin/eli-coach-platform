import type { TermsFacade } from "~/bounded-contexts/legal/public";
import { TermsFacadeAdapter } from "~/bounded-contexts/legal/legal/adapters/inbound/facades/terms-facade-adapter.server";
import type { DocumentHasherPort } from "~/bounded-contexts/legal/legal/domain/legal-document";

export type LegalFeature = {
  termsFacade: TermsFacade;
};

export type LegalFeatureHandles = {
  documentHasherPort: DocumentHasherPort;
};

export function composeLegalFeature(
  handles: LegalFeatureHandles,
): LegalFeature {
  return { termsFacade: new TermsFacadeAdapter(handles.documentHasherPort) };
}
