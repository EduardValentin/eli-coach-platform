import { AppShell } from "@eli-coach-platform/ui";
import type { MetaFunction } from "react-router";
import { Link } from "react-router";

export const meta: MetaFunction = () => [{ title: "Coach Workspace | Evoa" }];

export default function CoachHomeRoute() {
  return (
    <AppShell
      eyebrow="Coach Portal"
      title="Coach portal"
      description="Client management, plans, messages, and check-ins will live here."
    >
      {/* Stands in until GEN-181 builds the real dashboard, which is where the
          onboarding entry point belongs. */}
      <Link
        to="/coach/clients/onboard"
        className="inline-flex items-center rounded-md bg-brand-primary px-5 py-2.5 text-body-sm font-semibold text-text-inverted transition-colors hover:bg-brand-primary/90"
      >
        Onboard a client
      </Link>
    </AppShell>
  );
}
