import { landingHighlights, portalMilestones } from "@eli-coach-platform/content";
import { AppShell, Badge, Panel } from "@eli-coach-platform/ui";
import type { MetaFunction } from "react-router";

export const meta: MetaFunction = () => [
  { title: "Home | Eli Coach Platform" },
  {
    name: "description",
    content:
      "Eli Coach Platform unifies the public site, client portal, and coach workspace inside one accessible full-stack app.",
  },
];

export default function HomeRoute() {
  return (
    <AppShell
      eyebrow="Public Surface"
      title="A coaching platform that hooks visitors and keeps clients engaged."
      description="This MVP runs as one full-stack app so we can move quickly, keep hosting cheap, and still preserve clean boundaries between marketing, client, and coach experiences."
      footer="The app ships as one deployable now, but the code is organized so the public, client, and coach surfaces can separate later without rewriting the domain."
    >
      <Panel
        title="What this app optimizes for"
        description="The current architecture keeps delivery simple while preserving the internal seams needed for future extraction."
      >
        {landingHighlights.map((highlight) => (
          <Badge key={highlight}>{highlight}</Badge>
        ))}
      </Panel>
      <Panel
        title="What comes next"
        description="The scaffold is intentionally product-oriented: routes stay thin, domain code stays central, and each surface keeps its own UI and runtime identity."
      >
        <ul className="grid gap-2.5 pl-5 text-body-base text-text-secondary">
          {portalMilestones.map((milestone) => (
            <li key={milestone}>{milestone}</li>
          ))}
        </ul>
      </Panel>
    </AppShell>
  );
}
