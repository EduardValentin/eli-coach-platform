import type { MetaFunction } from "react-router";
import { useOutletContext } from "react-router";

import { MarketingAbout } from "./about/about";
import { MarketingCycleNutrition } from "./cycle-nutrition/cycle-nutrition";
import { MarketingHero } from "./hero/hero";
import type { MarketingOutletContext } from "./layout/layout";
import { MarketingMyMethod } from "./my-method/my-method";
import { MarketingPlatform } from "./platform/platform";
import { MarketingWorkouts } from "./workouts/workouts";

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
