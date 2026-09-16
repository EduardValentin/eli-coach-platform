import type { DatabaseClient } from "@eli-coach-platform/db";
import type { WaitlistConfig } from "@eli-coach-platform/config";
import { PRIVACY_POLICY_VERSION, WAITLIST_MARKETING_CONSENT_VERSION } from "@eli-coach-platform/content";
import type { BotVerifier, Clock, Logger, ProductEmail } from "@eli-coach-platform/domain/shared";
import { WaitlistService, type WaitlistConsentVersions } from "@eli-coach-platform/domain/waitlist";

import { WaitlistController } from "~/features/waitlist/api/waitlist-controller.server";
import { PostgresWaitlistRepository } from "~/features/waitlist/data/repository.server";
import { createWaitlistConfirmationService } from "~/features/waitlist/email/create-waitlist-confirmation-service.server";

export type WaitlistFeature = {
  waitlist: WaitlistController;
};

export type WaitlistFeatureHandles = {
  botVerifier: BotVerifier;
  clock: Clock;
  contactEmail: string;
  database: DatabaseClient;
  logger: Logger;
  privacyEmail: string;
  productEmail: ProductEmail;
  waitlist: WaitlistConfig;
};

const WAITLIST_CONSENT_VERSIONS = {
  marketingConsentVersion: WAITLIST_MARKETING_CONSENT_VERSION,
  privacyPolicyVersion: PRIVACY_POLICY_VERSION,
} satisfies WaitlistConsentVersions;

export function composeWaitlistFeature(handles: WaitlistFeatureHandles): WaitlistFeature {
  const service = new WaitlistService({
    cap: handles.waitlist.WAITLIST_CAP,
    clock: handles.clock,
    confirmationService: createWaitlistConfirmationService(handles.productEmail, {
      contactEmail: handles.contactEmail,
      privacyEmail: handles.privacyEmail,
    }),
    consentVersions: WAITLIST_CONSENT_VERSIONS,
    enabled: handles.waitlist.WAITLIST_MODE,
    logger: handles.logger,
    offer: {
      plan: handles.waitlist.WAITLIST_ACTIVE_OFFER_PLAN,
      campaignSlug: handles.waitlist.WAITLIST_ACTIVE_CAMPAIGN_SLUG,
    },
    repository: new PostgresWaitlistRepository(handles.database),
  });

  return { waitlist: new WaitlistController(service, handles.botVerifier) };
}
