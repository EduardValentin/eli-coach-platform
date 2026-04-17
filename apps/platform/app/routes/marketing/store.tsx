import { AppShell } from "@eli-coach-platform/ui";
import type { MetaFunction } from "react-router";

export const meta: MetaFunction = () => [
  { title: "Store | Eli Coach Platform" },
  {
    name: "description",
    content:
      "Digital guides designed to teach the basics of nutrition and workout planning and help you work toward your goals.",
  },
];

export default function StoreRoute() {
  return (
    <AppShell
      title="Store"
      description="Guides and digital products to help you build a better nutrition and workout plan for your goals."
    />
  );
}
