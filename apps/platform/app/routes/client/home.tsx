import { clientSurfaceLinks } from "@eli-coach-platform/domain";
import { AppShell, Badge, Panel } from "@eli-coach-platform/ui";

export default function ClientHomeRoute() {
  return (
    <AppShell
      eyebrow="Client Portal"
      title="Client-facing app shell"
      description="The client portal lives inside the full-stack app, but keeps its own route tree, manifest, service worker, and future feature boundaries."
      links={clientSurfaceLinks}
      footer="This surface stays mobile-friendly and installable while still sharing one runtime with the public and coach experiences."
    >
      <Panel
        title="What belongs here"
        description="Client routes should only own client-facing flows and compose domain services rather than embedding business rules inside route modules."
      >
        <Badge>Workout plans</Badge>
        <Badge>Check-ins</Badge>
        <Badge>Messages</Badge>
      </Panel>
      <Panel
        title="Near-term capabilities"
        description="The MVP client scope is intentionally narrow so we can launch quickly without muddying the code boundaries."
      >
        <ul className="grid gap-2.5 pl-5 text-body-base text-text-secondary">
          <li>Assigned workout plans and session views</li>
          <li>Progress snapshots and check-in submission</li>
          <li>Messaging, notifications, and account preferences</li>
        </ul>
      </Panel>
    </AppShell>
  );
}
