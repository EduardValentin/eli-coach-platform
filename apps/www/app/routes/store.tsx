import { AppShell, Panel } from "@eli-coach-platform/ui";

export default function StoreRoute() {
  return (
    <AppShell
      eyebrow="Store"
      title="Public commerce foundation"
      description="The store will share backend rules with the portals while staying independently indexable and conversion-focused."
      links={[
        { href: "/", label: "Landing" },
        { href: "/blog", label: "Blog" },
      ]}
    >
      <Panel
        title="Initial boundary"
        description="Checkout, carts, and payment events will flow through the shared API and worker instead of living in the public frontend."
      >
        <p style={paragraphStyle}>
          This route is the placeholder for product pages, collections, and purchase funnels. The implementation can
          now grow without changing the repo or deployment shape.
        </p>
      </Panel>
    </AppShell>
  );
}

const paragraphStyle = {
  lineHeight: 1.7,
  margin: 0,
};
