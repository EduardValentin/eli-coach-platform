import { AppShell, Panel } from "@eli-coach-platform/ui";

export default function BlogRoute() {
  return (
    <AppShell
      eyebrow="Blog"
      title="Editorial foundation"
      description="This route is intentionally simple for now. It exists so the SEO and content surface has a stable place in the architecture from day one."
      links={[
        { href: "/", label: "Landing" },
        { href: "/store", label: "Store" },
      ]}
    >
      <Panel
        title="Planned direction"
        description="Move blog content into a dedicated content package or CMS adapter once the editorial model stabilizes."
      >
        <p style={paragraphStyle}>
          The public content system will eventually own category pages, authoring workflows, structured metadata,
          and conversion-aware article templates.
        </p>
      </Panel>
    </AppShell>
  );
}

const paragraphStyle = {
  lineHeight: 1.7,
  margin: 0,
};
