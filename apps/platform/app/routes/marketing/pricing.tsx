import { AppShell } from "@eli-coach-platform/ui";
import type { MetaFunction } from "react-router";

export const meta: MetaFunction = () => [
  { title: "Pricing | Eli Coach Platform" },
  {
    name: "description",
    content:
      "Coaching plan pricing for women who want personalized training, nutrition support, and accountability.",
  },
];

export default function PricingRoute() {
  return (
    <AppShell
      title="Pricing"
      description="Coaching plan options and enrollment details will live here as the public launch experience comes together."
    />
  );
}
