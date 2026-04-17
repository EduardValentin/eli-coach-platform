import { AppShell } from "@eli-coach-platform/ui";
import type { MetaFunction } from "react-router";

export const meta: MetaFunction = () => [
  { title: "Home | Eli Coach Platform" },
  {
    name: "description",
    content:
      "Online coaching platform for women who want to improve their body, lifestyle, and mood.",
  },
];

export default function HomeRoute() {
  return (
    <AppShell
      title="Personalized coaching for women, with 1-on-1 support, nutrition guidance, and fitness training."
      description="Built to help you feel stronger, improve your habits, and feel better in your body."
    />
  );
}
