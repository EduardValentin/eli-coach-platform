import type { AccountSnapshot } from "./account";
import type { AccountsPort } from "./accounts-port";
import type { ApiKeyHolder, ApiKeyVerifierPort } from "./api-key-verifier-port";

const BEARER_SCHEME = "bearer";

export type ApiKeyAccountResolution =
  | { status: "resolved"; account: AccountSnapshot }
  | { status: "invalid" }
  | { status: "unprovisioned" }
  | { status: "unavailable" };

export class ResolveApiKeyAccountUseCase {
  constructor(
    private readonly options: {
      accountsPort: Pick<AccountsPort, "findByAuthSubjectId">;
      apiKeyVerifierPort: ApiKeyVerifierPort;
    },
  ) {}

  async execute(
    authorizationHeader: string | null,
  ): Promise<ApiKeyAccountResolution> {
    const secret = this.readBearerCredential(authorizationHeader);

    if (!secret) {
      return { status: "invalid" };
    }

    let holder: ApiKeyHolder | null;

    try {
      holder = await this.options.apiKeyVerifierPort.verify(secret);
    } catch {
      return { status: "unavailable" };
    }

    if (!holder) {
      return { status: "invalid" };
    }

    const account = await this.options.accountsPort.findByAuthSubjectId(
      holder.authSubjectId,
    );

    if (!account?.isActive()) {
      return { status: "unprovisioned" };
    }

    return { status: "resolved", account: account.toSnapshot() };
  }

  private readBearerCredential(header: string | null): string | null {
    const separatorIndex = header?.indexOf(" ") ?? -1;

    if (!header || separatorIndex <= 0) {
      return null;
    }

    if (header.slice(0, separatorIndex).toLowerCase() !== BEARER_SCHEME) {
      return null;
    }

    return header.slice(separatorIndex + 1).trim() || null;
  }
}
