import {
  composeLegalFeature,
  type LegalFeature,
  type LegalFeatureHandles,
} from "~/bounded-contexts/legal/legal/composition.server";

export type LegalComposition = {
  facades: { terms: LegalFeature["termsFacade"] };
};

export function composeLegal(handles: LegalFeatureHandles): LegalComposition {
  const legal = composeLegalFeature(handles);

  return {
    facades: { terms: legal.termsFacade },
  };
}
