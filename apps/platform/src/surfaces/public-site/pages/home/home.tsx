import type { LinksFunction, MetaFunction } from "react-router";
import { useOutletContext } from "react-router";

import { appUrl } from "~/shared/http/base-path";

import type { PublicOutletContext } from "~/surfaces/public-site/shell/layout";
import { PublicAbout } from "~/surfaces/public-site/sections/about/about";
import { PublicCycleNutrition } from "~/surfaces/public-site/sections/cycle-nutrition/cycle-nutrition";
import { PublicHero } from "~/surfaces/public-site/sections/hero/hero";
import { HERO_POSTER_PATH } from "~/surfaces/public-site/sections/hero/hero-media";
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

export const links: LinksFunction = () => [
  {
    rel: "preload",
    href: appUrl(HERO_POSTER_PATH),
    as: "image",
    type: "image/webp",
    fetchPriority: "high",
  },
];

export default function HomeRoute() {
  const { botDetection, waitlist } = useOutletContext<PublicOutletContext>();

  return (
    <>
      <PublicHero botDetection={botDetection} waitlist={waitlist} />
      <PublicAbout waitlist={waitlist} />
      <PublicPlatform />
      <PublicWorkouts />
      <PublicCycleNutrition />
      <PublicMyMethod />
    </>
  );
}
