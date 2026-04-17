import { AppShell } from "@eli-coach-platform/ui";
import type { MetaFunction } from "react-router";

export const meta: MetaFunction = () => [{ title: "Coach Workspace | Eli Coach Portal" }];

export default function CoachHomeRoute() {
  return (
    <AppShell
      eyebrow="Coach Portal"
      title="Coach portal"
      description="Client management, plans, messages, and check-ins will live here."
    />
  );
}
