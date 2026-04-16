import { AppShell, Panel } from "@eli-coach-platform/ui";
import type { MetaFunction } from "react-router";

export const meta: MetaFunction = () => [
  { title: "Blog | Eli Coach Platform" },
  {
    name: "description",
    content:
      "Editorial content for Eli Coach Platform, built to stay indexable, accessible, and cleanly separated from client and coach product flows.",
  },
];

export default function BlogRoute() {
  return (
    <AppShell
      eyebrow="Blog"
      title="Editorial foundation"
      description="The public content surface lives in the same app for MVP speed, while keeping the code path isolated from the authenticated product surfaces."
    >
      <Panel
        title="Planned direction"
        description="Blog content will eventually move behind richer content workflows, but the route, metadata, and SEO contract already exist."
      >
        <p className="m-0 text-body-base text-text-secondary">
          This area is where editorial content, article templates, topic hubs, and conversion-aware storytelling will
          grow without leaking coach or client concerns into the public experience.
        </p>
      </Panel>
    </AppShell>
  );
}
