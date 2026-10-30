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
  handles: { pricingEligibilitySourceFacade: PricingEligibilitySourceFacade };
};

type WaitlistFeatureHandles = {
  botVerifierPort: BotVerifierPort;
  clockPort: ClockPort;
  contactEmail: string;
  database: DatabaseClient;
  emailAcceptancePort: EmailAcceptancePort;
  featureFlagsFacade: FeatureFlagsFacade;
  loggerPort: LoggerPort;
  privacyEmail: string;
  productEmailPort: ProductEmailPort;
  waitlist: WaitlistConfig;
};

export function composeWaitlistFeature(
  handles: WaitlistFeatureHandles,
): WaitlistComposition {
  const waitlistIncidentsAdapter = new WaitlistIncidentsAdapter(
    handles.loggerPort,
  );
  const waitlist = Waitlist.configure({
    offer: {
      plan: handles.waitlist.WAITLIST_ACTIVE_OFFER_PLAN,
      campaignSlug: handles.waitlist.WAITLIST_ACTIVE_CAMPAIGN_SLUG,
    },
  });
  const postgresWaitlistRepository = new PostgresWaitlistRepository(
    handles.database,
  );

  return {
    feature: {
      waitlistController: new WaitlistController({
        botVerifierPort: handles.botVerifierPort,
        getWaitlistUseCase: new GetWaitlistUseCase({
          clockPort: handles.clockPort,
          waitlistIncidentsPort: waitlistIncidentsAdapter,
          waitlist,
          waitlistEntriesPort: postgresWaitlistRepository,
          waitlistModePort: new OperationsWaitlistModeAdapter(
            handles.featureFlagsFacade,
          ),
        }),
        joinWaitlistUseCase: new JoinWaitlistUseCase({
          waitlistConfirmationPort: createWaitlistConfirmationAdapter(
            handles.productEmailPort,
            {
              contactEmail: handles.contactEmail,
              privacyEmail: handles.privacyEmail,
            },
          ),
          consentVersionsPort: new LegalConsentVersionsAdapter(),
          emailAcceptancePort: handles.emailAcceptancePort,
          waitlistIncidentsPort: waitlistIncidentsAdapter,
          waitlist,
          waitlistEntriesPort: postgresWaitlistRepository,
        }),
      }),
    },
    handles: { pricingEligibilitySourceFacade: postgresWaitlistRepository },
  };
}
