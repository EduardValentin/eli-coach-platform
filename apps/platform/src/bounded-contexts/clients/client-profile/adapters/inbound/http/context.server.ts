import { createContext, type RouterContext } from "react-router";

import type { ClientAvatarController } from "~/bounded-contexts/clients/client-profile/adapters/inbound/http/avatar/client-avatar-controller.server";
import type { ClientSettingsController } from "~/bounded-contexts/clients/client-profile/adapters/inbound/http/client/client-settings-controller.server";
import type { ClientMeasurementsController } from "~/bounded-contexts/clients/client-profile/adapters/inbound/http/client/client-measurements-controller.server";
import type { OwnClientAvatarController } from "~/bounded-contexts/clients/client-profile/adapters/inbound/http/client/own-client-avatar-controller.server";
import type { OwnClientProfileController } from "~/bounded-contexts/clients/client-profile/adapters/inbound/http/client/own-client-profile-controller.server";
import type { ClientProfileController } from "~/bounded-contexts/clients/client-profile/adapters/inbound/http/coach/client-profile-controller.server";
import type { CoachClientAvatarController } from "~/bounded-contexts/clients/client-profile/adapters/inbound/http/coach/coach-client-avatar-controller.server";
import type { ProgressPhotoController } from "~/bounded-contexts/clients/client-profile/adapters/inbound/http/photos/progress-photo-controller.server";
import type { ClientOnboardingController } from "~/bounded-contexts/clients/client-profile/adapters/inbound/http/onboarding/client-onboarding-controller.server";
import type { OnboardingReviewController } from "~/bounded-contexts/clients/client-profile/adapters/inbound/http/onboarding/onboarding-review-controller.server";

export type ClientProfileFeature = {
  clientAvatarController: ClientAvatarController;
  clientMeasurementsController: ClientMeasurementsController;
  clientSettingsController: ClientSettingsController;
  coachClientAvatarController: CoachClientAvatarController;
  clientProfileController: ClientProfileController;
  ownClientAvatarController: OwnClientAvatarController;
  ownClientProfileController: OwnClientProfileController;
  progressPhotoController: ProgressPhotoController;
};

export type ClientOnboardingFeature = {
  clientOnboardingController: ClientOnboardingController;
  onboardingReviewController: OnboardingReviewController;
};

export const clientProfileContext: RouterContext<ClientProfileFeature> =
  createContext<ClientProfileFeature>();

export const clientOnboardingContext: RouterContext<ClientOnboardingFeature> =
  createContext<ClientOnboardingFeature>();
