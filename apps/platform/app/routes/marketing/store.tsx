import { AppShell, Panel } from "@eli-coach-platform/ui";
import type { MetaFunction } from "react-router";

export const meta: MetaFunction = () => [{ title: "Store | Eli Coach Platform" }];

export default function StoreRoute() {
  return (
    <AppShell
      eyebrow="Store"
      title="Commerce foundation"
      description="The public store stays indexable and conversion-focused, even while the product ships as one full-stack app."
    >
      <Panel
        title="Why it still belongs in the monolith"
        description="The store shares pricing, entitlement, and payment domain rules with the rest of the product, so keeping it close speeds up MVP work without erasing boundaries."
      >
        <p className="m-0 text-body-base text-text-secondary">
          Product pages, checkout entry points, and post-purchase access rules can all evolve here while reusing the
          same domain modules that will later support richer billing and entitlement workflows.
        </p>
      </Panel>
    </AppShell>
  );
}
