import { appMetadataSchema } from "@eli-coach-platform/contracts";

type AppMetadataControllerOptions = {
  appName: string;
  environment: string;
  version: string;
};

export class AppMetadataController {
  constructor(private readonly options: AppMetadataControllerOptions) {}

  handle(): Response {
    return Response.json(
      appMetadataSchema.parse({
        appName: this.options.appName,
        environment: this.options.environment,
        version: this.options.version,
      }),
    );
  }
}
