import type { DatabaseClient } from "@eli-coach-platform/db";
import type { RuntimeEnvironment } from "@eli-coach-platform/config";
import { PRIVACY_POLICY_VERSION, WAITLIST_MARKETING_CONSENT_VERSION } from "@eli-coach-platform/content";
import { WaitlistService, type WaitlistConsentVersions } from "@eli-coach-platform/domain/waitlist";
import type { BotVerifier } from "@eli-coach-platform/infrastructure/bot-detection/server";

import { WaitlistController } from "~/features/waitlist/api/waitlist-controller.server";
import { PostgresWaitlistRepository } from "~/features/waitlist/data/repository.server";
import { createWaitlistConfirmationService } from "~/features/waitlist/email/create-waitlist-confirmation-service.server";

export type WaitlistFeature = {
  waitlist: WaitlistController;
};

export type WaitlistFeatureHandles = {
  botVerifier: BotVerifier;
  database: DatabaseClient;
  runtimeEnvironment: RuntimeEnvironment;
};

const WAITLIST_CONSENT_VERSIONS = {
  marketingConsentVersion: WAITLIST_MARKETING_CONSENT_VERSION,
  privacyPolicyVersion: PRIVACY_POLICY_VERSION,
} satisfies WaitlistConsentVersions;

export function composeWaitlistFeature(handles: WaitlistFeatureHandles): WaitlistFeature {
  const service = new WaitlistService({
    cap: handles.runtimeEnvironment.WAITLIST_CAP,
    confirmationService: createWaitlistConfirmationService({ runtimeEnvironment: handles.runtimeEnvironment }),
    consentVersions: WAITLIST_CONSENT_VERSIONS,
    enabled: handles.runtimeEnvironment.WAITLIST_MODE,
    offer: {
      plan: handles.runtimeEnvironment.WAITLIST_ACTIVE_OFFER_PLAN,
      campaignSlug: handles.runtimeEnvironment.WAITLIST_ACTIVE_CAMPAIGN_SLUG,
    },
    repository: new PostgresWaitlistRepository(handles.database),
  });

  return { waitlist: new WaitlistController(service, handles.botVerifier) };
}
