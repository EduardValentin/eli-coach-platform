import type { MetaFunction } from "react-router";
import { useOutletContext } from "react-router";

import { MarketingHero } from "./hero";
import type { MarketingOutletContext } from "./layout";

export const meta: MetaFunction = () => [
  { title: "Strength Coaching for Women, Online or In Person — with Eli" },
  {
    name: "description",
    content:
      "Strength and nutrition coaching for women, online or in person. Plans that take your cycle into account, with weekly check-ins and clear form videos.",
  },
];

export default function HomeRoute() {
  const { waitlist } = useOutletContext<MarketingOutletContext>();

  return (
    <>
      <MarketingHero
        isWaitlistEnabled={waitlist.enabled}
        waitlistCap={waitlist.cap}
        waitlistSpotsRemaining={waitlist.spotsRemaining}
      />
      <div aria-hidden="true" className="h-24 bg-surface-page" />
    </>
  );
}
