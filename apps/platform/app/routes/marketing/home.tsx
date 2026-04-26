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
    <section className="min-h-screen bg-surface-inverted">
      <h1 className="ui-sr-only">Eli Fitness landing page hero placeholder</h1>
    </section>
  );
}
