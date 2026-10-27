import type { MiddlewareFunction } from "react-router";

import {
  composeLegalFeature,
  type LegalFeature,
  type LegalFeatureHandles,
} from "~/bounded-contexts/legal/legal/composition.server";

export type LegalComposition = {
  components: { legal: LegalFeature };
  facades: { terms: LegalFeature["terms"] };
  middleware: MiddlewareFunction<Response>;
};

export function composeLegal(handles: LegalFeatureHandles): LegalComposition {
  const legal = composeLegalFeature(handles);

  return {
    components: { legal },
    facades: { terms: legal.terms },
    middleware: (_args, next) => next(),
  };
}
