import { marketingSurfaceLinks } from "@eli-coach-platform/domain";
import { MarketingSurfaceLayout } from "@eli-coach-platform/ui";
import { Outlet } from "react-router";

export default function MarketingLayoutRoute() {
  return (
    <MarketingSurfaceLayout
      links={marketingSurfaceLinks}
      navigationLabel="Public site navigation"
      title="Eli Coach Platform"
    >
      <Outlet />
    </MarketingSurfaceLayout>
  );
}
