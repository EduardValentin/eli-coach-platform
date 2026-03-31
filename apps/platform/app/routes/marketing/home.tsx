import { landingHighlights, portalMilestones } from "@eli-coach-platform/content";
import { marketingSurfaceLinks } from "@eli-coach-platform/domain";
import { AppShell, Badge, Panel } from "@eli-coach-platform/ui";

export default function HomeRoute() {
  return (
    <AppShell
      eyebrow="Public Surface"
      title="A coaching platform that hooks visitors and keeps clients engaged."
      description="This MVP runs as one full-stack app so we can move quickly, keep hosting cheap, and still preserve clean boundaries between marketing, client, and coach experiences."
      links={marketingSurfaceLinks}
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
        <ul style={listStyle}>
          {portalMilestones.map((milestone) => (
            <li key={milestone}>{milestone}</li>
          ))}
        </ul>
      </Panel>
    </AppShell>
  );
}

const listStyle = {
  display: "grid",
  gap: "10px",
  margin: 0,
  paddingLeft: "20px",
};
