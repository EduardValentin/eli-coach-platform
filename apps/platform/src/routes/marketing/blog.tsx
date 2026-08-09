import { AppShell } from "@eli-coach-platform/ui";
import type { MetaFunction } from "react-router";

export const meta: MetaFunction = () => [
  { title: "Blog | Eli Coach Platform" },
  {
    name: "description",
    content:
      "Articles on women's health, nutrition, fitness, and lifestyle to help you understand your body and build better habits.",
  },
];

export default function BlogRoute() {
  return (
    <AppShell
      title="Blog"
      description="Learn more about training, nutrition, lifestyle, and the basics of taking better care of your body."
    />
  );
}
