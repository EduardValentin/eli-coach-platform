import type { MetaFunction } from "react-router";
import { useOutletContext } from "react-router";

import type { PublicOutletContext } from "~/surfaces/public-site/shell/layout";
import { PublicAbout } from "~/surfaces/public-site/sections/about/about";
import { PublicCycleNutrition } from "~/surfaces/public-site/sections/cycle-nutrition/cycle-nutrition";
import { PublicHero } from "~/surfaces/public-site/sections/hero/hero";
import { PublicMyMethod } from "~/surfaces/public-site/sections/my-method/my-method";
import { PublicPlatform } from "~/surfaces/public-site/sections/platform/platform";
import { PublicWorkouts } from "~/surfaces/public-site/sections/workouts/workouts";

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
  } = useOutletContext<PublicOutletContext>();

  return (
    <>
      <PublicHero
        botDetection={botDetection}
        waitlist={waitlist}
        waitlistAvailabilityPresentationState={waitlistAvailabilityPresentationState}
      />
      <PublicAbout waitlist={waitlist} />
      <PublicPlatform />
      <PublicWorkouts />
      <PublicCycleNutrition />
      <PublicMyMethod />
    </>
  );
}
