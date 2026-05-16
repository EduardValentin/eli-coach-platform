import type { MetaFunction } from "react-router";
import { useOutletContext } from "react-router";

import { MarketingAbout } from "./about/about";
import { MarketingCycleNutrition } from "./cycle-nutrition/cycle-nutrition";
import { MarketingHero } from "./hero/hero";
import type { MarketingOutletContext } from "./layout/layout";
import { MarketingPlatform } from "./platform/platform";
import { MarketingWorkouts } from "./workouts/workouts";

export const meta: MetaFunction = () => [
  { title: "Strength Coaching for Women, Online or In Person — with Eli" },
  {
    name: "description",
    content:
      "Strength and nutrition coaching for women, online or in person. Plans that take your cycle into account, with weekly check-ins and clear form videos.",
  },
];

export default function HomeRoute() {
  const { botDetectionConfig, waitlist } = useOutletContext<MarketingOutletContext>();

  return (
    <>
      <MarketingHero botDetectionConfig={botDetectionConfig} waitlist={waitlist} />
      <MarketingAbout waitlist={waitlist} />
      <MarketingPlatform />
      <MarketingWorkouts />
      <MarketingCycleNutrition />
      <div aria-hidden="true" className="h-24 bg-surface-page" />
    </>
  );
}
