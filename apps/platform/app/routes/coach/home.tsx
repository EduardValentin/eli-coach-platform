import { coachSurfaceLinks } from "@eli-coach-platform/domain";
import { AppShell, Badge, Panel } from "@eli-coach-platform/ui";

export default function CoachHomeRoute() {
  return (
    <AppShell
      eyebrow="Coach Portal"
      title="Coach-facing operations shell"
      description="The coach surface stays operationally distinct, even though it now ships from the same full-stack app as the public and client routes."
      links={coachSurfaceLinks}
      footer="Coach routes should remain thin orchestration layers over domain services so this surface can be extracted later if operational complexity demands it."
    >
      <Panel
        title="What belongs here"
        description="Coach-facing routes own operational workflows, not generic helpers or public-facing presentation concerns."
      >
        <Badge>Client roster</Badge>
        <Badge>Plan builder</Badge>
        <Badge>Scheduling</Badge>
      </Panel>
      <Panel
        title="Near-term capabilities"
        description="The first coach workflows should lay down strong domain seams while keeping the MVP delivery model simple."
      >
        <ul style={listStyle}>
          <li>Client roster and lifecycle states</li>
          <li>Workout plan builder foundation</li>
          <li>Check-in orchestration, messaging, and notes</li>
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
