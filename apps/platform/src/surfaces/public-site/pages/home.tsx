import type { MetaFunction } from "react-router";
import { useOutletContext } from "react-router";

import type { MarketingOutletContext } from "~/surfaces/public-site/shell/layout";
import { MarketingAbout } from "~/surfaces/public-site/sections/about/about";
import { MarketingCycleNutrition } from "~/surfaces/public-site/sections/cycle-nutrition/cycle-nutrition";
import { MarketingHero } from "~/surfaces/public-site/sections/hero/hero";
import { MarketingMyMethod } from "~/surfaces/public-site/sections/my-method/my-method";
import { MarketingPlatform } from "~/surfaces/public-site/sections/platform/platform";
import { MarketingWorkouts } from "~/surfaces/public-site/sections/workouts/workouts";

export const meta: MetaFunction = () => [
  { title: "Strength Coaching for Women — with Eli" },
  {
    name: "description",
    content:
      "Strength and nutrition coaching for women. Plans that take your cycle into account, with weekly check-ins and clear form videos.",
  },
];

export default function HomeRoute() {
  const {
    botDetection,
    waitlist,
    waitlistAvailabilityPresentationState,
  } = useOutletContext<MarketingOutletContext>();

  return (
    <>
      <MarketingHero
        botDetection={botDetection}
        waitlist={waitlist}
        waitlistAvailabilityPresentationState={waitlistAvailabilityPresentationState}
      />
      <MarketingAbout waitlist={waitlist} />
      <MarketingPlatform />
      <MarketingWorkouts />
      <MarketingCycleNutrition />
      <MarketingMyMethod />
    </>
  );
}
