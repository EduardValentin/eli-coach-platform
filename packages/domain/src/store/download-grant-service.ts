import type { DownloadGrant } from "./models";
import type { StoreClock } from "./store-acquisition-service";

export interface DownloadTokenHasher {
  sha256(rawToken: string): string;
}

export interface DownloadGrantRepository {
  findByTokenSha256(tokenSha256: string): Promise<DownloadGrant | null>;
}

export type DownloadGrantResolution =
  | {
      status: "available";
      grant: DownloadGrant;
    }
  | { status: "unavailable" };

type DownloadGrantServiceOptions = {
  clock: StoreClock;
  repository: DownloadGrantRepository;
  tokenHasher: DownloadTokenHasher;
};

export class DownloadGrantService {
  constructor(private readonly options: DownloadGrantServiceOptions) {}

  async resolve(rawToken: string): Promise<DownloadGrantResolution> {
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
