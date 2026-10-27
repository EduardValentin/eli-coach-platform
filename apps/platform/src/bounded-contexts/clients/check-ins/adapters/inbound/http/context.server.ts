import { createContext, type RouterContext } from "react-router";

import type { ClientCheckInsController } from "~/bounded-contexts/clients/check-ins/adapters/inbound/http/client/client-check-ins-controller.server";
import type { CoachCheckInSeriesController } from "~/bounded-contexts/clients/check-ins/adapters/inbound/http/coach/coach-check-in-series-controller.server";
import type { CoachCheckInsController } from "~/bounded-contexts/clients/check-ins/adapters/inbound/http/coach/coach-check-ins-controller.server";
import type { CheckInJoinController } from "~/bounded-contexts/clients/check-ins/adapters/inbound/http/join/check-in-join-controller.server";
import type { SharedCheckInsController } from "~/bounded-contexts/clients/check-ins/adapters/inbound/http/shared/shared-check-ins-controller.server";

export type CheckInsFeature = {
  checkInJoin: CheckInJoinController;
  clientCheckIns: ClientCheckInsController;
  coachCheckIns: CoachCheckInsController;
  coachCheckInSeries: CoachCheckInSeriesController;
  sharedCheckIns: SharedCheckInsController;
};

export const checkInsContext: RouterContext<CheckInsFeature> =
  createContext<CheckInsFeature>();
