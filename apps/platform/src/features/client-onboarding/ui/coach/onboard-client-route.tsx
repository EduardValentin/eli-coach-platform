import type { MetaFunction } from "react-router";

import { OnboardClientPage } from "./onboard-client-page";

export const meta: MetaFunction = () => [{ title: "Onboard new client" }];

export default function OnboardClientRoute() {
  return <OnboardClientPage />;
}
