import type { DatabaseClient } from "~/shared/database";
import type { WaitlistConfig } from "~/bounded-contexts/sales/waitlist/config.server";
import type { PricingEligibilitySourceFacade } from "~/bounded-contexts/sales/waitlist/public/pricing-eligibility-source-facade";
import type { EmailAcceptancePort } from "~/bounded-contexts/sales/waitlist/domain/email-acceptance-port";
import type { FeatureFlagsFacade } from "~/bounded-contexts/operations/public/feature-flags-facade";
import type { ClockPort } from "~/bounded-contexts/sales/waitlist/domain/clock-port";
import {
  GetWaitlistUseCase,
  JoinWaitlistUseCase,
  Waitlist,
} from "~/bounded-contexts/sales/waitlist/domain/waitlist";
import type { BotVerifierPort } from "~/shared/submission-checks/bot-detection/index.server";
import type { ProductEmailPort } from "~/shared/email/index.server";

import { WaitlistController } from "~/bounded-contexts/sales/waitlist/adapters/inbound/http/waitlist-controller.server";
import { PostgresWaitlistRepository } from "~/bounded-contexts/sales/waitlist/adapters/outbound/persistence/postgres-waitlist-repository.server";
import { createWaitlistConfirmationAdapter } from "~/bounded-contexts/sales/waitlist/adapters/outbound/email/create-waitlist-confirmation-adapter.server";
import type { WaitlistFeature } from "~/bounded-contexts/sales/waitlist/adapters/inbound/http/context.server";
import type { LoggerPort } from "~/shared/logging/logger-port.server";
import { WaitlistIncidentsAdapter } from "~/bounded-contexts/sales/waitlist/adapters/outbound/logging/waitlist-incidents-adapter.server";
import { LegalConsentVersionsAdapter } from "~/bounded-contexts/sales/waitlist/adapters/outbound/legal/legal-consent-versions-adapter.server";
import { OperationsWaitlistModeAdapter } from "~/bounded-contexts/sales/waitlist/adapters/outbound/operations/operations-waitlist-mode-adapter.server";

type WaitlistComposition = {
  feature: WaitlistFeature;
  handles: { pricingEligibility: PricingEligibilitySourceFacade };
};

type WaitlistFeatureHandles = {
  botVerifier: BotVerifierPort;
  clock: ClockPort;
  contactEmail: string;
  database: DatabaseClient;
  emailAcceptance: EmailAcceptancePort;
  featureFlags: FeatureFlagsFacade;
  logger: LoggerPort;
  privacyEmail: string;
  productEmail: ProductEmailPort;
  waitlist: WaitlistConfig;
};

export function composeWaitlistFeature(
  handles: WaitlistFeatureHandles,
): WaitlistComposition {
  const incidents = new WaitlistIncidentsAdapter(handles.logger);
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
          waitlistMode: new OperationsWaitlistModeAdapter(handles.featureFlags),
        }),
        joinWaitlist: new JoinWaitlistUseCase({
          confirmation: createWaitlistConfirmationAdapter(
            handles.productEmail,
            {
              contactEmail: handles.contactEmail,
              privacyEmail: handles.privacyEmail,
            },
          ),
          consentVersions: new LegalConsentVersionsAdapter(),
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
