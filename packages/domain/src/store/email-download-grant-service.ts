import type { EmailDownloadGrant } from "./models";
import type { StoreClock } from "./store-acquisition-service";

export interface DownloadTokenHasher {
  sha256(rawToken: string): string;
}

export interface EmailDownloadGrantRepository {
  findByTokenSha256(tokenSha256: string): Promise<EmailDownloadGrant | null>;
}

export type EmailDownloadGrantResolution =
  | {
      status: "available";
      grant: EmailDownloadGrant;
    }
  | { status: "unavailable" };

type EmailDownloadGrantServiceOptions = {
  clock: StoreClock;
  repository: EmailDownloadGrantRepository;
  tokenHasher: DownloadTokenHasher;
};

export class EmailDownloadGrantService {
  constructor(private readonly options: EmailDownloadGrantServiceOptions) {}

  async resolve(rawToken: string): Promise<EmailDownloadGrantResolution> {
    if (!rawToken.trim()) {
      return { status: "unavailable" };
    }

    const grant = await this.options.repository.findByTokenSha256(
      this.options.tokenHasher.sha256(rawToken),
    );

    if (
      !grant ||
      grant.status !== "active" ||
      grant.expiresAt.getTime() <= this.options.clock.now().getTime()
    ) {
      return { status: "unavailable" };
    }

    return { status: "available", grant };
  }
}
