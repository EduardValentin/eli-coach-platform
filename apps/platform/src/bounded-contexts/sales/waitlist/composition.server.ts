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
} from "~/bounded-contexts/sales/waitlist/domain/waitlist";
import type { BotVerifier } from "~/shared/submission-checks/bot-detection/index.server";
import type { ProductEmail } from "~/shared/email/index.server";

import { WaitlistController } from "~/bounded-contexts/sales/waitlist/adapters/inbound/http/waitlist-controller.server";
import { PostgresWaitlistRepository } from "~/bounded-contexts/sales/waitlist/adapters/outbound/persistence/repository.server";
import { createWaitlistConfirmation } from "~/bounded-contexts/sales/waitlist/adapters/outbound/email/create-waitlist-confirmation.server";
import type { WaitlistFeature } from "~/bounded-contexts/sales/waitlist/adapters/inbound/http/context.server";
import type { Logger } from "~/shared/logging/console-logger.server";
import { createWaitlistIncidents } from "~/bounded-contexts/sales/waitlist/adapters/outbound/logging/waitlist-incidents.server";

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
): WaitlistComposition {
  const incidents = createWaitlistIncidents(handles.logger);
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
          incidents,
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
          incidents,
          waitlist,
          waitlistEntries,
        }),
      }),
    },
    handles: { pricingEligibility: waitlistEntries },
  };
}
