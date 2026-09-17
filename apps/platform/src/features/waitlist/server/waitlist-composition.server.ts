import type { DatabaseClient } from "@eli-coach-platform/db";
import type { WaitlistConfig } from "@eli-coach-platform/config";
import {
  PRIVACY_POLICY_VERSION,
  WAITLIST_MARKETING_CONSENT_VERSION,
} from "@eli-coach-platform/content";
import type {
  BotVerifier,
  Clock,
  Logger,
  ProductEmail,
} from "@eli-coach-platform/domain/shared";
import {
  GetWaitlistUseCase,
  JoinWaitlistUseCase,
  Waitlist,
  type WaitlistConsentVersions,
} from "@eli-coach-platform/domain/waitlist";

import { WaitlistController } from "~/features/waitlist/api/waitlist-controller.server";
import { PostgresWaitlistRepository } from "~/features/waitlist/data/repository.server";
import { createWaitlistConfirmation } from "~/features/waitlist/email/create-waitlist-confirmation.server";

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

export function composeWaitlistFeature(
  handles: WaitlistFeatureHandles,
): WaitlistFeature {
  const waitlist = Waitlist.configure({
    cap: handles.waitlist.WAITLIST_CAP,
    enabled: handles.waitlist.WAITLIST_MODE,
    offer: {
      plan: handles.waitlist.WAITLIST_ACTIVE_OFFER_PLAN,
      campaignSlug: handles.waitlist.WAITLIST_ACTIVE_CAMPAIGN_SLUG,
    },
  });
  const waitlistEntries = new PostgresWaitlistRepository(handles.database);

  return {
    waitlist: new WaitlistController({
      botVerifier: handles.botVerifier,
      getWaitlist: new GetWaitlistUseCase({
        clock: handles.clock,
        waitlist,
        waitlistEntries,
      }),
      joinWaitlist: new JoinWaitlistUseCase({
        confirmation: createWaitlistConfirmation(handles.productEmail, {
          contactEmail: handles.contactEmail,
          privacyEmail: handles.privacyEmail,
        }),
        consentVersions: WAITLIST_CONSENT_VERSIONS,
        logger: handles.logger,
        waitlist,
        waitlistEntries,
      }),
    }),
  };
}
