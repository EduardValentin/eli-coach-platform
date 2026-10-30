import type { ClockPort } from "../clock-port";

import type { DownloadGrant, GrantDelivery } from "./download-grant";
import type { DownloadGrantsPort } from "./download-grants-port";
import type { DownloadTokenHasherPort } from "./download-token-hasher-port";

export type DownloadGrantResolution =
  | { status: "available"; delivery: GrantDelivery; grant: DownloadGrant }
  | { status: "unavailable" };

export class ResolveDownloadGrantUseCase {
  constructor(
    private readonly options: {
      clock: ClockPort;
      downloadGrants: DownloadGrantsPort;
      tokenHasher: DownloadTokenHasherPort;
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
