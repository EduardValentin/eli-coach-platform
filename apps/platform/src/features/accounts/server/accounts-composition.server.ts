import type { DatabaseClient } from "@eli-coach-platform/db";
import { AccountProvisioningService } from "@eli-coach-platform/domain";

import { AccountController } from "~/features/accounts/api/account-controller.server";
import { AccountWebhookController } from "~/features/accounts/api/webhook-controller.server";
import { PostgresAccountRepository } from "~/features/accounts/data/account-repository.server";

export type AccountsFeature = {
  account: AccountController;
  portal: { appBasePath: string; publicAppUrl: string | undefined; signInUrl: string };
  provisioning: AccountProvisioningService;
  webhooks: AccountWebhookController;
};

export type AccountsFeatureHandles = {
  bootstrapCoachAuthSubjectId: string | undefined;
  clerkWebhookSigningSecret: string | undefined;
  database: DatabaseClient;
  portal: AccountsFeature["portal"];
};

export function composeAccountsFeature(handles: AccountsFeatureHandles): AccountsFeature {
  const repository = new PostgresAccountRepository(handles.database);

  return {
    account: new AccountController(),
    portal: handles.portal,
    provisioning: new AccountProvisioningService({
      bootstrapCoachAuthSubjectId: handles.bootstrapCoachAuthSubjectId,
      repository,
    }),
    webhooks: new AccountWebhookController(repository, handles.clerkWebhookSigningSecret),
  };
}
