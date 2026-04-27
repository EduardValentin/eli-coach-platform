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
    <section className="bg-surface-inverted">
      <div className="h-screen">
        <h1 className="ui-sr-only">Eli Fitness landing page hero placeholder</h1>
      </div>
      <div aria-hidden="true" className="h-24" />
    </section>
  );
}
