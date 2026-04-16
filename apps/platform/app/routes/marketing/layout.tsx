import { marketingSurfaceLinks } from "@eli-coach-platform/domain";
import { MarketingSurfaceLayout } from "@eli-coach-platform/ui";
import { Outlet } from "react-router";

export default function MarketingLayoutRoute() {
  return (
    <MarketingSurfaceLayout
      description="A warm, premium coaching experience that keeps the public site, client portal, and coach workspace accessible and clearly separated."
      eyebrow="Public Surface"
      links={marketingSurfaceLinks}
      navigationLabel="Public site navigation"
      title="Eli Coach Platform"
    >
      <Outlet />
    </MarketingSurfaceLayout>
  );
}
