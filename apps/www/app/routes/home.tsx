import { landingHighlights, portalMilestones } from "@eli-coach-platform/content";
import { publicSurfaceLinks } from "@eli-coach-platform/domain";
import { AppShell, Badge, Panel } from "@eli-coach-platform/ui";

export default function HomeRoute() {
  return (
    <AppShell
      eyebrow="Public Surface"
      title="A coaching platform that sells, converts, and retains."
      description="This scaffold keeps marketing, store, blog, and portal delivery separate while sharing domain primitives and runtime contracts."
      links={publicSurfaceLinks}
      footer="This is the initial public surface scaffold. Content, commerce, and SEO depth will grow as the PRD matures."
    >
      <Panel
        title="What this app owns"
        description="The public surface is responsible for search traffic, storytelling, conversion paths, and checkout entry points."
      >
        {landingHighlights.map((highlight) => (
          <Badge key={highlight}>{highlight}</Badge>
        ))}
      </Panel>
      <Panel
        title="What comes next"
        description="The bootstrap lays down the routing, deployment, and shared-package shape so the product can evolve without reworking the foundations."
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
