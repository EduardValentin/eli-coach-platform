import { AppShell } from "@eli-coach-platform/ui";
import type { MetaFunction } from "react-router";

export const meta: MetaFunction = () => [{ title: "Client Dashboard | Eli Client Portal" }];

export default function ClientHomeRoute() {
  return (
    <AppShell
      eyebrow="Client Portal"
      title="Client portal"
      description="Your workouts, check-ins, and support will live here."
    />
  );
}
