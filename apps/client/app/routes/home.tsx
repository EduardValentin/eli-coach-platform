import { AppShell, Badge, Panel } from "@eli-coach-platform/ui";

export default function HomeRoute() {
  return (
    <AppShell
      eyebrow="Client Portal"
      title="Client-facing app shell"
      description="This installable surface is reserved for the client journey: workouts, check-ins, messages, progress, and account flows."
      links={[
        { href: ".", label: "Dashboard" },
        { href: "../", label: "Public Site" },
      ]}
      footer="The client portal shares contracts and deployment tooling with the rest of the platform while keeping its own bundle and PWA identity."
    >
      <Panel
        title="PWA-ready boundary"
        description="This app already owns its own manifest, service worker registration, build output, and deployment slot."
      >
        <Badge>Installable shell</Badge>
        <Badge>Dedicated bundle</Badge>
        <Badge>Shared backend contracts</Badge>
      </Panel>
      <Panel
        title="Planned capabilities"
        description="The actual client workflows will grow here without leaking coach-specific UI or public-site code into the runtime."
      >
        <ul style={listStyle}>
          <li>Assigned workout plans and workout session views</li>
          <li>Messaging and notification center</li>
          <li>Check-ins, progress history, and account preferences</li>
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
