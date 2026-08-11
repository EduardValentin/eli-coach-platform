import {
  botDetectionConfigSchema,
  type BotDetectionConfig,
} from "./bot-detection-contract";

export class BotDetectionController {
  constructor(private readonly config: BotDetectionConfig) {}

  getConfig(): Response {
    // Parse on the way out, like FeatureFlagController, so the endpoint emits
    // exactly what the browser accepts instead of relying on the excess-property
    // check at the one site that builds the config.
    const responseBody = botDetectionConfigSchema.parse(this.config);

    return Response.json(responseBody, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }
}
