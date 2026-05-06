import type { MetaFunction } from "react-router";
import { useOutletContext } from "react-router";

import { MarketingHero } from "./hero/hero";
import type { MarketingOutletContext } from "./layout/layout";

export const meta: MetaFunction = () => [
  { title: "Strength Coaching for Women, Online or In Person — with Eli" },
  {
    name: "description",
    content:
      "Strength and nutrition coaching for women, online or in person. Plans that take your cycle into account, with weekly check-ins and clear form videos.",
  },
];

export default function HomeRoute() {
  const { botDetection, waitlist } = useOutletContext<MarketingOutletContext>();

  return (
    <>
      <MarketingHero botDetection={botDetection} waitlist={waitlist} />
      <div aria-hidden="true" className="h-24 bg-surface-page" />
    </>
  );
}
