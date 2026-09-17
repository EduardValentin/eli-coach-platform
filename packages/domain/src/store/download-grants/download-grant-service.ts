import type { Clock } from "../../shared";

import {
  isDownloadGrantActive,
  resolveGrantDelivery,
  type DownloadGrantResolution,
} from "./download-grant";
import type { DownloadGrant } from "../models";

export interface DownloadTokenHasher {
  sha256(rawToken: string): string;
}

export interface DownloadGrants {
  findByTokenSha256(tokenSha256: string): Promise<DownloadGrant | null>;
}

export type { DownloadGrantResolution };

type DownloadGrantServiceOptions = {
  clock: Clock;
  repository: DownloadGrants;
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

    if (!grant || !isDownloadGrantActive(grant, this.options.clock.now())) {
      return { status: "unavailable" };
    }

    return {
      status: "available",
      delivery: resolveGrantDelivery(grant),
      grant,
    };
  }
}
