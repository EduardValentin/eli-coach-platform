import type { Clock } from "../shared";

import type { DownloadGrant, GrantDelivery } from "./download-grant";
import type { DownloadGrants, DownloadTokenHasher } from "./download-grants";

export type DownloadGrantResolution =
  | { status: "available"; delivery: GrantDelivery; grant: DownloadGrant }
  | { status: "unavailable" };

export class ResolveDownloadGrantUseCase {
  constructor(
    private readonly options: {
      clock: Clock;
      downloadGrants: DownloadGrants;
      tokenHasher: DownloadTokenHasher;
    },
  ) {}

  async execute(rawToken: string): Promise<DownloadGrantResolution> {
    if (!rawToken.trim()) {
      return { status: "unavailable" };
    }

    const grant = await this.options.downloadGrants.findByTokenSha256(
      this.options.tokenHasher.sha256(rawToken),
    );

    if (!grant || !grant.isActive(this.options.clock.now())) {
      return { status: "unavailable" };
    }

    return {
      status: "available",
      delivery: grant.delivery(),
      grant,
    };
  }
}
