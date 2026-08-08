import type { BotDetectionConfig } from "./bot-detection-contract";

export class BotDetectionController {
  constructor(private readonly config: BotDetectionConfig) {}

  getConfig(): Response {
    return Response.json(this.config, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }
}
