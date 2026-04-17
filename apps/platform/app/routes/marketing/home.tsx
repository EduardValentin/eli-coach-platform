import { landingHighlights, portalMilestones } from "@eli-coach-platform/content";
import { AppShell, Badge, Panel } from "@eli-coach-platform/ui";
import type { MetaFunction } from "react-router";

export const meta: MetaFunction = () => [
  { title: "Home | Eli Coach Platform" },
  {
    name: "description",
    content:
      "Online coaching for women who want training and nutrition support that feels clear, personal, and realistic.",
  },
];

export default function HomeRoute() {
  return (
    <AppShell
      title="Training and nutrition support that fits real life."
      description="Build strength, feel better in your body, and follow a plan that works with your goals, your cycle, and your day-to-day routine."
    >
      <Panel
        title="What you can expect"
        description="Clear structure, real support, and coaching that meets you where you are instead of asking you to become someone else first."
      >
        {landingHighlights.map((highlight) => (
          <Badge key={highlight}>{highlight}</Badge>
        ))}
      </Panel>
      <Panel
        title="How we support you"
        description="The platform is built to make the next step feel obvious, whether you want coaching, educational content, or a simple starting point."
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
