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
      clockPort: ClockPort;
      downloadGrantsPort: DownloadGrantsPort;
      downloadTokenHasherPort: DownloadTokenHasherPort;
    },
  ) {}

  async execute(rawToken: string): Promise<DownloadGrantResolution> {
    if (!rawToken.trim()) {
      return { status: "unavailable" };
    }

    const grant = await this.options.downloadGrantsPort.findByTokenSha256(
      this.options.downloadTokenHasherPort.sha256(rawToken),
    );

    if (!grant || !grant.isActive(this.options.clockPort.now())) {
      return { status: "unavailable" };
    }

    return {
      status: "available",
      delivery: grant.delivery(),
      grant,
    };
  }
}
