import { marketingSurfaceLinks } from "@eli-coach-platform/domain";
import { AppShell, Panel } from "@eli-coach-platform/ui";

export default function BlogRoute() {
  return (
    <AppShell
      eyebrow="Blog"
      title="Editorial foundation"
      description="The public content surface lives in the same app for MVP speed, while keeping the code path isolated from the authenticated product surfaces."
      links={marketingSurfaceLinks}
    >
      <Panel
        title="Planned direction"
        description="Blog content will eventually move behind richer content workflows, but the route, metadata, and SEO contract already exist."
      >
        <p style={paragraphStyle}>
          This area is where editorial content, article templates, topic hubs, and conversion-aware storytelling will
          grow without leaking coach or client concerns into the public experience.
        </p>
      </Panel>
    </AppShell>
  );
}

const paragraphStyle = {
  lineHeight: 1.7,
  margin: 0,
};
