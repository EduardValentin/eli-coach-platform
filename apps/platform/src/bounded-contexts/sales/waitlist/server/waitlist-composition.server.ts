import type { DatabaseClient } from "~/shared/database";
import type { WaitlistConfig } from "~/bounded-contexts/sales/waitlist/config.server";
import type { PricingEligibility } from "~/bounded-contexts/sales/coaching-sales/domain/coaching-bundle";
import {
  PRIVACY_POLICY_VERSION,
  WAITLIST_MARKETING_CONSENT_VERSION,
} from "~/bounded-contexts/legal/public";
import type { EmailAcceptance } from "~/bounded-contexts/sales/waitlist/domain/email-acceptance";
import type { FeatureFlagReader } from "~/bounded-contexts/operations/feature-flags/domain/feature-flag";
import type { Clock } from "~/bounded-contexts/sales/waitlist/domain/clock";
import {
  GetWaitlistUseCase,
  JoinWaitlistUseCase,
  Waitlist,
  type WaitlistConsentVersions,
  type WaitlistIncidents,
} from "~/bounded-contexts/sales/waitlist/domain/waitlist";
import type { BotVerifier } from "~/shared/submission-checks/bot-detection/index.server";
import type { ProductEmail } from "~/shared/email/index.server";

import { WaitlistController } from "~/bounded-contexts/sales/waitlist/api/waitlist-controller.server";
import { PostgresWaitlistRepository } from "~/bounded-contexts/sales/waitlist/data/repository.server";
import { createWaitlistConfirmation } from "~/bounded-contexts/sales/waitlist/email/create-waitlist-confirmation.server";

export type WaitlistFeature = {
  waitlist: WaitlistController;
};

type WaitlistComposition = {
  feature: WaitlistFeature;
  handles: { pricingEligibility: PricingEligibility };
};

type WaitlistFeatureHandles = {
  botVerifier: BotVerifier;
  clock: Clock;
  contactEmail: string;
  database: DatabaseClient;
  emailAcceptance: EmailAcceptance;
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
): WaitlistComposition {
  const waitlist = Waitlist.configure({
    offer: {
      plan: handles.waitlist.WAITLIST_ACTIVE_OFFER_PLAN,
      campaignSlug: handles.waitlist.WAITLIST_ACTIVE_CAMPAIGN_SLUG,
    },
  });
  const waitlistEntries = new PostgresWaitlistRepository(handles.database);

  return {
    feature: {
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
          emailAcceptance: handles.emailAcceptance,
          incidents: handles.incidents,
          waitlist,
          waitlistEntries,
        }),
      }),
    },
    handles: { pricingEligibility: waitlistEntries },
  };
}
