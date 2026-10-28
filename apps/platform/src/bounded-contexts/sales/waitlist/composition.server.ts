import type { DatabaseClient } from "~/shared/database";
import type { WaitlistConfig } from "~/bounded-contexts/sales/waitlist/config.server";
import type { PricingEligibilitySource } from "~/bounded-contexts/sales/waitlist/public/pricing-eligibility";
import type { EmailAcceptance } from "~/bounded-contexts/sales/waitlist/domain/email-acceptance";
import type { FeatureFlagsFacade } from "~/bounded-contexts/operations/public/feature-flags";
import type { Clock } from "~/bounded-contexts/sales/waitlist/domain/clock";
import {
  GetWaitlistUseCase,
  JoinWaitlistUseCase,
  Waitlist,
} from "~/bounded-contexts/sales/waitlist/domain/waitlist";
import type { BotVerifier } from "~/shared/submission-checks/bot-detection/index.server";
import type { ProductEmail } from "~/shared/email/index.server";

import { WaitlistController } from "~/bounded-contexts/sales/waitlist/adapters/inbound/http/waitlist-controller.server";
import { PostgresWaitlistRepository } from "~/bounded-contexts/sales/waitlist/adapters/outbound/persistence/repository.server";
import { createWaitlistConfirmation } from "~/bounded-contexts/sales/waitlist/adapters/outbound/email/create-waitlist-confirmation.server";
import type { WaitlistFeature } from "~/bounded-contexts/sales/waitlist/adapters/inbound/http/context.server";
import type { Logger } from "~/shared/logging/console-logger.server";
import { createWaitlistIncidents } from "~/bounded-contexts/sales/waitlist/adapters/outbound/logging/waitlist-incidents.server";
import { LegalConsentVersions } from "~/bounded-contexts/sales/waitlist/adapters/outbound/legal/consent-versions.server";
import { OperationsWaitlistMode } from "~/bounded-contexts/sales/waitlist/adapters/outbound/operations/waitlist-mode.server";

type WaitlistComposition = {
  feature: WaitlistFeature;
  handles: { pricingEligibility: PricingEligibilitySource };
};

type WaitlistFeatureHandles = {
  botVerifier: BotVerifier;
  clock: Clock;
  contactEmail: string;
  database: DatabaseClient;
  emailAcceptance: EmailAcceptance;
  featureFlags: FeatureFlagsFacade;
  logger: Logger;
  privacyEmail: string;
  productEmail: ProductEmail;
  waitlist: WaitlistConfig;
};

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
          incidents,
          waitlist,
          waitlistEntries,
          waitlistMode: new OperationsWaitlistMode(handles.featureFlags),
        }),
        joinWaitlist: new JoinWaitlistUseCase({
          confirmation: createWaitlistConfirmation(handles.productEmail, {
            contactEmail: handles.contactEmail,
            privacyEmail: handles.privacyEmail,
          }),
          consentVersions: new LegalConsentVersions(),
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
