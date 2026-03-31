import { AppShell, Badge, Panel } from "@eli-coach-platform/ui";

export default function HomeRoute() {
  return (
    <AppShell
      eyebrow="Coach Portal"
      title="Coach-facing operations shell"
      description="This surface is where plan building, scheduling, client management, and internal operational tooling will live."
      links={[
        { href: ".", label: "Workspace" },
        { href: "../", label: "Public Site" },
      ]}
      footer="The coach portal stays independently deployable so the plan-builder and admin workflows can evolve without polluting client or public bundles."
    >
      <Panel
        title="Why it is separate"
        description="The coach surface is operationally heavier than the client portal and benefits from different performance, bundle, and navigation priorities."
      >
        <Badge>Plan builder home</Badge>
        <Badge>Messaging hub</Badge>
        <Badge>Scheduling operations</Badge>
      </Panel>
      <Panel
        title="Near-term implementation track"
        description="The next passes will flesh out the coaching workflow while reusing shared contracts, shared UI primitives, and the common backend."
      >
        <ul style={listStyle}>
          <li>Client roster and lifecycle state</li>
          <li>Workout plan builder foundation</li>
          <li>Check-in orchestration and messaging</li>
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
