import { AppShell, Panel } from "@eli-coach-platform/ui";
import type { MetaFunction } from "react-router";

export const meta: MetaFunction = () => [
  { title: "Blog | Eli Coach Platform" },
  {
    name: "description",
    content:
      "Simple, helpful articles on training, nutrition, and women's health to help you make better decisions without the noise.",
  },
];

export default function BlogRoute() {
  return (
    <AppShell
      title="Blog"
      description="Helpful reads on training, nutrition, recovery, and the small things that make progress feel steadier."
    >
      <Panel
        title="What you'll find here"
        description="Straightforward guidance you can actually use when you want more clarity and less noise."
      >
        <p className="m-0 text-body-base text-text-secondary">
          Training advice, nutrition support, and practical education will live here so it's easier to keep learning
          between workouts and check-ins.
        </p>
      </Panel>
    </AppShell>
  );
}
