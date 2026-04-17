import { AppShell, Panel } from "@eli-coach-platform/ui";
import type { MetaFunction } from "react-router";

export const meta: MetaFunction = () => [
  { title: "Store | Eli Coach Platform" },
  {
    name: "description",
    content:
      "Browse guides and digital products designed to make training, nutrition, and healthy routines easier to follow.",
  },
];

export default function StoreRoute() {
  return (
    <AppShell
      title="Store"
      description="Digital guides and tools that make it easier to train well, eat well, and stay consistent."
    >
      <Panel
        title="Designed to support the work you're already doing"
        description="Simple resources you can come back to whenever you want more structure, support, or a clearer next step."
      >
        <p className="m-0 text-body-base text-text-secondary">
          Over time this space will hold guides, paid resources, and practical tools that fit naturally alongside
          coaching and the rest of the public experience.
        </p>
      </Panel>
    </AppShell>
  );
}
