import type { DatabaseClient } from "@eli-coach-platform/db";
import type { WaitlistConfig } from "@eli-coach-platform/config";
import {
  PRIVACY_POLICY_VERSION,
  WAITLIST_MARKETING_CONSENT_VERSION,
} from "@eli-coach-platform/content";
import type { FeatureFlagReader } from "@eli-coach-platform/domain/feature-flag";
import type { Clock } from "@eli-coach-platform/domain/shared";
import {
  GetWaitlistUseCase,
  JoinWaitlistUseCase,
  Waitlist,
  type WaitlistConsentVersions,
  type WaitlistIncidents,
} from "@eli-coach-platform/domain/waitlist";
import type { BotVerifier } from "@eli-coach-platform/infrastructure/bot-detection/server";
import type { ProductEmail } from "@eli-coach-platform/infrastructure/email/server";

import { WaitlistController } from "~/features/waitlist/api/waitlist-controller.server";
import { PostgresWaitlistRepository } from "~/features/waitlist/data/repository.server";
import { createWaitlistConfirmation } from "~/features/waitlist/email/create-waitlist-confirmation.server";

export type WaitlistFeature = {
  waitlist: WaitlistController;
};

type WaitlistFeatureHandles = {
  botVerifier: BotVerifier;
  clock: Clock;
  contactEmail: string;
  database: DatabaseClient;
  featureFlags: FeatureFlagReader;
  incidents: WaitlistIncidents;
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
        featureFlags: handles.featureFlags,
        incidents: handles.incidents,
        waitlist,
        waitlistEntries,
      }),
      joinWaitlist: new JoinWaitlistUseCase({
        confirmation: createWaitlistConfirmation(handles.productEmail, {
          contactEmail: handles.contactEmail,
          privacyEmail: handles.privacyEmail,
        }),
        consentVersions: WAITLIST_CONSENT_VERSIONS,
        incidents: handles.incidents,
        waitlist,
        waitlistEntries,
      }),
    }),
  };
}
